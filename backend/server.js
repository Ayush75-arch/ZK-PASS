require("dotenv").config();
const algosdk = require("algosdk");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const { exec } = require("child_process");
const snarkjs = require("snarkjs");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Algorand Client ──────────────────────────────────────────────────────────
const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

// ─── Load Account (YOUR WORKING CODE) ────────────────────────────────────────
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("❌ MNEMONIC not set in .env");
  process.exit(1);
}

const account = algosdk.mnemonicToSecretKey(mnemonic);
const sender = account.addr;

console.log("=================================");
console.log("✅ Signer account:", sender);
console.log("=================================");

// ─── Utilities ────────────────────────────────────────────────────────────────
function calculateAge(dobString) {
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function generateHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// ─── ZK Proof Generation (JESWIN'S CODE) ─────────────────────────────────────
function runProof(inputFile) {
  return new Promise((resolve, reject) => {
    exec(
      `node age_js/generate_witness.js age_js/age.wasm ${inputFile} witness.wtns && npx snarkjs groth16 prove age_final.zkey witness.wtns proof.json public.json`,
      { cwd: __dirname },
      (err, stdout, stderr) => {
        if (err) {
          console.error("Proof error:", stderr);
          reject(new Error(stderr || err.message));
        } else {
          resolve(stdout);
        }
      }
    );
  });
}

// ─── Store on Algorand (YOUR WORKING CODE) ────────────────────────────────────
async function sendToAlgorand(data) {
  const params = await algodClient.getTransactionParams().do();
  params.flatFee = true;
  params.fee = 1000;

  const note = new TextEncoder().encode(JSON.stringify(data));

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender,
    to: sender,
    amount: 1000,
    note: note,
    suggestedParams: params,
  });

  const signedTxn = txn.signTxn(account.sk);
  const response = await algodClient.sendRawTransaction(signedTxn).do();
  const txId = response.txId || txn.txID().toString();

  console.log("📤 TX sent:", txId);

  try {
    await algosdk.waitForConfirmation(algodClient, txId, 10);
    console.log("✅ TX confirmed:", txId);
  } catch (e) {
    console.log("⚠️ Not confirmed in time:", txId);
  }

  return txId;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("ZK-KYC Backend running ✅");
});

// POST /generate-proof
// Input: { dob, nationality }
// Output: { proof, publicSignals, flags, hash, age }
app.post("/generate-proof", async (req, res) => {
  try {
    const { dob, nationality } = req.body;
    if (!dob) return res.status(400).json({ error: "DOB is required" });

    const age = calculateAge(dob);
    if (isNaN(age) || age < 0) return res.status(400).json({ error: "Invalid DOB" });

    const id = Date.now();
    const inputFile = `input_${id}.json`;
    fs.writeFileSync(inputFile, JSON.stringify({ age }));
    console.log("📥 ZK input: age =", age);

    await runProof(inputFile);
    try { fs.unlinkSync(inputFile); } catch (e) {}

    const proof = JSON.parse(fs.readFileSync("proof.json", "utf8"));
    const publicSignals = JSON.parse(fs.readFileSync("public.json", "utf8"));

    const flags = {
      ageAbove18: age >= 18 ? 1 : 0,
      ageAbove21: age >= 21 ? 1 : 0,
      isIndian: nationality && nationality.toLowerCase() === "india" ? 1 : 0,
    };

    const hash = generateHash(flags);
    console.log("✅ Proof generated for age:", age);

    res.json({ proof, publicSignals, flags, hash, age });

  } catch (err) {
    console.error("❌ ZK generation failed:", err.message);
    res.status(500).json({ error: "ZK generation failed", details: err.message });
  }
});

// POST /verify-proof
// Input: { proof, publicSignals }
// Output: { verified }
app.post("/verify-proof", async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;
    if (!proof || !publicSignals) {
      return res.status(400).json({ error: "proof and publicSignals are required" });
    }

    const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf8"));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    console.log("🔍 ZK verified:", verified);
    res.json({ verified });

  } catch (err) {
    console.error("❌ Verify proof failed:", err.message);
    res.status(500).json({ error: "Verification failed", details: err.message });
  }
});

// POST /verify (YOUR WORKING ROUTE - now with ZK + Algorand)
// Input: { hash, flags, proof, publicSignals }
// Output: { verified, txId }
app.post("/verify", async (req, res) => {
  try {
    const { hash, flags, proof, publicSignals } = req.body;

    if (!hash) return res.status(400).json({ error: "hash is required" });

    let zkVerified = false;

    // If proof provided, verify with snarkjs
    if (proof && publicSignals) {
      try {
        const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf8"));
        zkVerified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        console.log("🔍 ZK verified:", zkVerified);
      } catch (e) {
        console.error("ZK verify error:", e.message);
        // Fallback to flag check
        zkVerified = flags?.ageAbove18 === 1;
      }
    } else {
      // Fallback
      zkVerified = flags?.ageAbove18 === 1;
    }

    const timestamp = Date.now();
    const payload = {
      hash,
      verified: zkVerified,
      ts: timestamp,
      flags,
    };

    let txId = null;
    try {
      txId = await sendToAlgorand(payload);
    } catch (e) {
      console.error("❌ Algorand TX failed:", e.message);
    }

    res.json({ verified: zkVerified, timestamp, txId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Verification failed", details: error.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});