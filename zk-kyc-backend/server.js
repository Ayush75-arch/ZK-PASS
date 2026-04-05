require("dotenv").config();
const express = require("express");
const algosdk = require("algosdk");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const mnemonic = process.env.MNEMONIC;

const account = algosdk.mnemonicToSecretKey(mnemonic);
const sender = account.addr;

console.log("=================================");
console.log("🚀 USING ACCOUNT:");
console.log(sender);
console.log("=================================");

const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.post("/verify", async (req, res) => {
  try {
    console.log("➡️ Verification request received");

    const params = await algodClient.getTransactionParams().do();
    params.flatFee = true;
    params.fee = 1000;

    const note = new TextEncoder().encode("AGE_VERIFIED|LoanApp|demo");

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: sender,
      receiver: sender,
      amount: 1000,
      note: note,
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(account.sk);
    const response = await algodClient.sendRawTransaction(signedTxn).do();
    const txId = response.txId || txn.txID().toString();

    console.log("📤 Transaction sent:", txId);

    try {
      await algosdk.waitForConfirmation(algodClient, txId, 10);
      console.log("✅ Transaction confirmed");
    } catch (e) {
      console.log("⚠️ Not confirmed in time, but sent:", txId);
    }

    res.json({ success: true, txId: txId });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log("=================================");
  console.log("✅ Server running on http://localhost:5000");
  console.log("=================================");
});