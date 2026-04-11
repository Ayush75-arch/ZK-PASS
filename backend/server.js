require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const algosdk = require("algosdk");
const snarkjs = require("snarkjs");

const app = express();
app.use(express.json());
app.use(cors());

// ─── Algorand Setup ───────────────────────────────────────────────────────────
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("❌  MNEMONIC not set in .env — Algorand transactions will fail.");
}

let account, sender;
try {
  account = algosdk.mnemonicToSecretKey(mnemonic);
  sender = account.addr;
  console.log("=================================");
  console.log("🚀 ALGORAND ACCOUNT:", sender);
  console.log("=================================");
} catch (e) {
  console.warn("⚠️  Could not decode mnemonic:", e.message);
}

const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

// ─── ZK Artifact Paths ────────────────────────────────────────────────────────
const WASM_PATH = path.join(__dirname, "identity_js", "identity.wasm");
const ZKEY_PATH = path.join(__dirname, "identity_final.zkey");
const VKEY_PATH = path.join(__dirname, "verification_key.json");

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ status: "ZK-PASS Integrated Backend running 🚀" });
});

app.post("/verify-identity", async (req, res) => {
  try {
    const { age, nationality } = req.body;

    if (age === undefined || !nationality) {
      return res.status(400).json({ success: false, error: "age and nationality are required" });
    }

    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      return res.status(400).json({ success: false, error: "Invalid age value" });
    }

    const isIndian = nationality.trim().toLowerCase() === "indian" ? 1 : 0;
    const input = { age: ageNum, isIndian };

    console.log("🔐 Generating ZK proof for input:", input);

    let proof, publicSignals;
    try {
      ({ proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        WASM_PATH,
        ZKEY_PATH
      ));
      console.log("✅ Proof generated. Public signals:", publicSignals);
    } catch (zkErr) {
      console.error("❌ Proof generation failed:", zkErr.message);
      return res.status(500).json({ success: false, error: "ZK proof generation failed: " + zkErr.message });
    }

    const vKey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
    const proofValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    // publicSignals[0] is the circuit's isValid output — must be "1" to pass
    const zkVerified = proofValid && publicSignals[0] === "1";
    console.log(`Proof cryptographically valid: ${proofValid}, isValid signal: ${publicSignals[0]}`);
    console.log(zkVerified ? "✅ Identity passed circuit constraints" : "❌ Identity failed circuit constraints");

    if (!zkVerified) {
      return res.json({
        success: false,
        zkVerified: false,
        message: "Identity does not meet requirements — must be age > 18 and Indian nationality.",
      });
    }

    if (!account) {
      return res.json({
        success: true,
        zkVerified: true,
        txId: null,
        proof,
        publicSignals,
        message: "ZK proof verified ✅ (Algorand skipped — MNEMONIC not set)",
      });
    }

    const params = await algodClient.getTransactionParams().do();
    params.flatFee = true;
    params.fee = 1000;

    const proofFingerprint = proof.pi_a[0].slice(0, 16);
    const noteText = `ZK_VERIFIED|age>=${ageNum >= 18 ? "18" : "?"}|isIndian=${isIndian}|fp=${proofFingerprint}`;
    const note = new TextEncoder().encode(noteText);

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: sender,
      receiver: sender,
      amount: 1000,
      note,
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(account.sk);
    const response = await algodClient.sendRawTransaction(signedTxn).do();
    const txId = response.txId || txn.txID().toString();
    console.log("📤 Algorand tx sent:", txId);

    try {
      await algosdk.waitForConfirmation(algodClient, txId, 10);
      console.log("✅ Algorand tx confirmed");
    } catch {
      console.log("⚠️  Tx not confirmed in time, but submitted:", txId);
    }

    return res.json({
      success: true,
      zkVerified: true,
      txId,
      proof,
      publicSignals,
      message: "Identity verified ✅ — ZK proof valid and anchored on Algorand",
    });

  } catch (err) {
    console.error("❌ Unhandled error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/verify-proof", async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;
    if (!proof || !publicSignals) {
      return res.status(400).json({ success: false, error: "proof and publicSignals are required" });
    }

    const vKey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    res.json({
      success: true,
      verified,
      message: verified ? "Proof is valid ✅" : "Proof is invalid ❌",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log("=================================");
  console.log("✅ ZK-PASS backend on http://localhost:5000");
  console.log("   POST /verify-identity  { age, nationality }");
  console.log("   POST /verify-proof     { proof, publicSignals }");
  console.log("=================================");
});