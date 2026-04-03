const algosdk = require("algosdk");

const acc = algosdk.generateAccount();

console.log("Address:", algosdk.encodeAddress(acc.addr.publicKey));
console.log("Mnemonic:", algosdk.secretKeyToMnemonic(acc.sk));