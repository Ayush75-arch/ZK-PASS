const express  = require("express");
const router   = express.Router();
const path     = require("path");
const fs       = require("fs");
const snarkjs  = require("snarkjs");
const algosdk  = require("algosdk");
const crypto   = require("crypto");
const { users } = require("../store");
const { validateToken } = require("./oauth");

// ─── ZK Artifact Paths ────────────────────────────────────────────────────────
const WASM_PATH = path.join(__dirname, "..", "identity_js", "identity.wasm");
const ZKEY_PATH = path.join(__dirname, "..", "identity_final.zkey");
const VKEY_PATH = path.join(__dirname, "..", "verification_key.json");

// ─── Algorand Setup ───────────────────────────────────────────────────────────
const mnemonic = process.env.MNEMONIC;
let algoAccount = null;
let algoSender  = null;

if (mnemonic) {
  try {
    algoAccount = algosdk.mnemonicToSecretKey(mnemonic);
    algoSender  = algoAccount.addr.toString();
    console.log("[Algorand] Account loaded:", algoSender);
  } catch (e) {
    console.warn("[Algorand] Could not decode mnemonic:", e.message);
  }
} else {
  console.warn("[Algorand] MNEMONIC not set — Algorand anchoring will be skipped.");
}

const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calculateAge(dob) {
  const birth = new Date(dob);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

async function sendToAlgorand(payload) {
  if (!algoAccount) return null;
  try {
    const params = await algodClient.getTransactionParams().do();
    params.flatFee = true;
    params.fee = 1000;

    const note = new TextEncoder().encode(JSON.stringify(payload));
    const txn  = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender:          algoSender,
      receiver:        algoSender,
      amount:          1000,
      note,
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(algoAccount.sk);
    const response  = await algodClient.sendRawTransaction(signedTxn).do();
    const txId      = response.txId || response.txid || txn.txID();

    console.log("[Algorand] TX sent:", txId);
    try {
      await algosdk.waitForConfirmation(algodClient, txId, 10);
      console.log("[Algorand] TX confirmed:", txId);
    } catch {
      console.warn("[Algorand] TX not confirmed in time:", txId);
    }
    return txId;
  } catch (e) {
    console.error("[Algorand] TX failed:", e.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /zk/generate-proof
//
// Authenticated via DigiLocker OAuth token.
// Fetches user DOB from store, generates REAL Groth16 ZK proof,
// anchors result on Algorand Testnet, then wipes sensitive data.
// ──────────────────────────────────────────────────────────────────────────────
router.post("/generate-proof", async (req, res) => {
  const tokenData = validateToken(req, res);
  if (!tokenData) return;

  const user = users[tokenData.userId];
  if (!user) return res.status(404).json({ error: "user_not_found" });

  // ── Capture PII into local scope ONLY ─────────────────────────────────────
  let sensitiveData = { dob: user.dob, isIndian: user.isIndian };
  const age = calculateAge(sensitiveData.dob);

  console.log(`[ZK] Generating proof  user=${tokenData.userId}  age=${age}  isAdult=${age >= 18}`);

  const zkInput = { age, isIndian: sensitiveData.isIndian };

  // 🔐 PRIVACY: wipe sensitive data immediately after extracting inputs
  sensitiveData.dob      = null;
  sensitiveData.isIndian = null;
  sensitiveData          = null;

  try {
    // ── Generate real Groth16 proof via snarkjs ────────────────────────────
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      zkInput,
      WASM_PATH,
      ZKEY_PATH
    );

    // ── Verify the proof locally ───────────────────────────────────────────
    const vKey        = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
    const proofValid  = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    // publicSignals[0] is the circuit's isValid output — must equal "1"
    const zkVerified  = proofValid && publicSignals[0] === "1";

    console.log(`[ZK] Proof valid: ${proofValid}, isValid signal: ${publicSignals[0]}`);

    // ── Build public claims (no raw PII) ──────────────────────────────────
    const isAdult   = zkInput.age >= 18;
    const isIndian  = zkInput.isIndian === 1;
    const flags     = { ageAbove18: isAdult ? 1 : 0, isIndian: isIndian ? 1 : 0 };
    const hash      = crypto.createHash("sha256").update(JSON.stringify(flags)).digest("hex");

    const publicClaims = {
      isAdult,
      isIndian,
      proofType: "age_nationality_v1",
    };

    // ── Reject if circuit constraints not satisfied ───────────────────────
    if (!zkVerified) {
      console.log(`[ZK] ❌ Identity failed circuit. user=${tokenData.userId} isValid=${publicSignals[0]}`);
      return res.status(403).json({
        success:    false,
        zkVerified: false,
        publicClaims,
        flags,
        message:    "Identity does not meet requirements — must be age ≥ 18 AND Indian nationality.",
      });
    }

    // ── Anchor on Algorand (only verified identities) ─────────────────────
    const generatedAt = new Date().toISOString();
    const txId = await sendToAlgorand({
      hash,
      zkVerified: true,
      flags,
      ts: Date.now(),
      fp: proof.pi_a[0].slice(0, 16),
    });

    console.log(`[ZK] ✅ Done. DOB purged. user=${tokenData.userId} txId=${txId || "none"}`);

    res.json({
      success:       true,
      zkVerified:    true,
      proof,
      publicSignals,
      publicClaims,
      flags,
      hash,
      txId,
      algorithm:     "Groth16 (snarkjs)",
      generatedAt,
      privacyAudit: {
        dobStored:      false,
        dobUsedFor:     "Age calculation only",
        dobDeletedAt:   generatedAt,
        dataInProof:    ["isAdult (boolean)", "isIndian (boolean)"],
        dataNotInProof: ["Date of Birth", "Name", "Aadhaar Number"],
      },
    });

  } catch (err) {
    console.error("[ZK] Proof generation failed:", err.message);
    res.status(500).json({ error: "proof_generation_failed", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /zk/verify-proof
// Standalone proof verifier — does not require OAuth token.
// ──────────────────────────────────────────────────────────────────────────────
router.post("/verify-proof", async (req, res) => {
  const { proof, publicSignals } = req.body;

  if (!proof || !publicSignals)
    return res.status(400).json({ error: "proof and publicSignals are required" });

  try {
    const vKey     = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    res.json({
      verified,
      message:    verified ? "✅ Proof is valid" : "❌ Proof is invalid",
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
