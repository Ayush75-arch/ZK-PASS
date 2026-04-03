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

// ─── IMPORTANT: Add a .env file with: MNEMONIC=your words here ───────────────
const MNEMONIC = process.env.MNEMONIC || "your mnemonic here";

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

// ─── Algorand: Store proof on-chain ──────────────────────────────────────────
async function sendToAlgorand(data) {
  try {
    const account = algosdk.mnemonicToSecretKey(MNEMONIC);
    const params = await algodClient.getTransactionParams().do();

    // Keep payload minimal — Algorand note field max is 1024 bytes
    const payload = {
      hash: data.hash,
      verified: data.verified,
      ts: data.timestamp,
      flags: data.zkFlags,
    };

    const note = new TextEncoder().encode(JSON.stringify(payload));

    if (note.length > 1024) {
      throw new Error("Payload exceeds Algorand 1024 byte note limit");
    }

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr,
      amount: 0,
      note,
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(account.sk);
    const tx = await algodClient.sendRawTransaction(signedTxn).do();

    console.log("✅ Algorand TX ID:", tx.txId);
    return tx.txId;
  } catch (error) {
    console.error("❌ Algorand error:", error.message);
    throw error;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("ZK-KYC Backend running ✅");
});

// POST /extract
// Input:  { dob: "YYYY-MM-DD", nationality: "India" }
// Output: age proofs + SHA-256 hash (no raw DOB stored or returned)
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

    // Only derived proofs — raw DOB never leaves this function
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
// Input:  { hash, ageAbove18, isIndian }
// Output: verification result + Algorand TX ID
// TODO (Jeswin): Replace the verified logic with actual snarkjs proof verification
app.post("/verify", async (req, res) => {
  try {
    const { hash, ageAbove18, isIndian } = req.body;

    if (!hash) {
      return res.status(400).json({ error: "hash is required" });
    }

    // Placeholder — swap this with snarkjs verify when ZK circuit is ready
    const verified = ageAbove18 === 1 && isIndian === 1;

    const timestamp = Date.now();

    const blockchainPayload = {
      hash,
      verified,
      timestamp,
      zkFlags: { ageAbove18, isIndian },
    };

    const txId = await sendToAlgorand(blockchainPayload);

    console.log(`🔗 /verify → verified=${verified}, txId=${txId}`);

    res.json({ ...blockchainPayload, txId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Verification failed", details: error.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});