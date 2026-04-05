require("dotenv").config();
const algosdk = require("algosdk");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Algorand Client ──────────────────────────────────────────────────────────
const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

// ─── Load Account ─────────────────────────────────────────────────────────────
const MNEMONIC = process.env.MNEMONIC;
if (!MNEMONIC) {
  console.error("❌ MNEMONIC not set in .env");
  process.exit(1);
}

const account = algosdk.mnemonicToSecretKey(MNEMONIC);
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

// ─── Store on Algorand ────────────────────────────────────────────────────────
async function sendToAlgorand(payload) {
  const params = await algodClient.getTransactionParams().do();
  params.flatFee = true;
  params.fee = 1000;

  const note = new TextEncoder().encode(JSON.stringify(payload));

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
    console.log("⚠️ Not confirmed in time but sent:", txId);
  }

  return txId;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("ZK-KYC Backend running ✅");
});

// POST /extract
app.post("/extract", (req, res) => {
  try {
    const { dob, nationality } = req.body;

    if (!dob || !nationality) {
      return res.status(400).json({ error: "dob and nationality are required" });
    }

    const birthDate = new Date(dob);
    if (isNaN(birthDate)) {
      return res.status(400).json({ error: "Invalid DOB format. Use YYYY-MM-DD" });
    }

    const age = calculateAge(dob);

    const proofData = {
      ageAbove18: age >= 18 ? 1 : 0,
      ageAbove21: age >= 21 ? 1 : 0,
      isIndian: nationality.toLowerCase() === "india" ? 1 : 0,
    };

    const hash = generateHash(proofData);

    console.log(`📋 /extract → age=${age}, hash=${hash.slice(0, 16)}...`);

    res.json({ ...proofData, hash });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// POST /verify
app.post("/verify", async (req, res) => {
  try {
    const { hash, ageAbove18, isIndian } = req.body;

    if (!hash) {
      return res.status(400).json({ error: "hash is required" });
    }

    const verified = ageAbove18 === 1 && isIndian === 1;
    const timestamp = Date.now();

    const payload = {
      hash,
      verified,
      ts: timestamp,
      flags: { ageAbove18, isIndian },
    };

    let txId = null;
    try {
      txId = await sendToAlgorand(payload);
    } catch (e) {
      console.error("❌ Algorand TX failed:", e.message);
    }

    res.json({ hash, verified, timestamp, txId });

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