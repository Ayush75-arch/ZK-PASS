const algosdk = require("algosdk");

// Connect to Algorand TestNet
const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

// ✅ Temporary DEV account (for testing only)
const mnemonic = "army van defense carry jealous true garbage claim echo media make crunch";

// Convert mnemonic → account
const account = algosdk.mnemonicToSecretKey(mnemonic);
const sender = account.addr;

console.log("Using Address:", sender);

async function sendTransaction() {
  try {
    const params = await algodClient.getTransactionParams().do();

    // 🔐 This is your "proof log"
    const note = new TextEncoder().encode(
      "AGE_VERIFIED|LoanApp|demo"
    );

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: sender,
      receiver: sender,
      amount: 1000, // 0.001 ALGO
      note: note,
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(account.sk);

    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    console.log("✅ Transaction Sent!");
    console.log("Tx ID:", txId);

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

sendTransaction();