# ZK-PASS — Integrated

Zero-Knowledge Identity Verification anchored on the Algorand blockchain.

## What it does

1. **User inputs** their age and nationality in the React frontend.
2. **Backend generates** a Groth16 ZK proof using the compiled `identity` circom circuit.
   - Circuit constraints: `age ≥ 18` **AND** `isIndian == 1`
   - The proof proves these facts *without* revealing the actual values.
3. **Backend verifies** the proof locally with snarkjs.
4. **If valid**, it submits an Algorand testnet transaction with the proof fingerprint in the `note` field — creating an immutable on-chain record.
5. **Frontend** shows the ZK result, Algorand Tx ID, and expandable raw proof.

---

## Project Structure

```
ZK-PASS-integrated/
├── backend/
│   ├── server.js              ← Integrated Express server (ZK + Algorand)
│   ├── package.json
│   ├── .env.example           ← Copy to .env and fill in your MNEMONIC
│   ├── identity_final.zkey    ← Groth16 proving key
│   ├── verification_key.json  ← Groth16 verification key
│   └── identity_js/
│       ├── identity.wasm      ← Compiled circom circuit
│       └── witness_calculator.js
└── frontend/
    ├── package.json
    ├── public/
    └── src/
        ├── App.js             ← Updated UI (age + nationality + ZK + Algorand)
        ├── App.css
        └── ...
```

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — paste your Algorand testnet mnemonic
node server.js
```

Get a free testnet account + funds: https://bank.testnet.algorand.network/

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000**, backend on **http://localhost:5000**.

---

## API Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/` | — | Health check |
| POST | `/verify-identity` | `{ age, nationality }` | Full ZK proof + Algorand anchor |
| POST | `/verify-proof` | `{ proof, publicSignals }` | Standalone proof verification |

### Example request

```bash
curl -X POST http://localhost:5000/verify-identity \
  -H "Content-Type: application/json" \
  -d '{"age": 22, "nationality": "Indian"}'
```

### Example response

```json
{
  "success": true,
  "zkVerified": true,
  "txId": "ABCDEF123...",
  "proof": { "pi_a": [...], "pi_b": [...], "pi_c": [...] },
  "publicSignals": ["1"],
  "message": "Identity verified ✅ — ZK proof valid and anchored on Algorand"
}
```

---

## Circuit

`circuits/identity.circom` (from ZK-PASS-zk-proof):

```circom
template IdentityCheck() {
    signal input age;
    signal input isIndian;   // 1 = Indian, 0 = Foreign
    signal output isValid;

    component gt = GreaterThan(8);
    gt.in[0] <== age;
    gt.in[1] <== 18;

    isValid <== gt.out * isIndian;  // adult AND Indian
}
```

The public output `isValid` is `1` only if both conditions hold.

---

## What changed from the original repos

| | ZK-PASS-main-ayush (original) | ZK-PASS-zk-proof (original) | ZK-PASS-integrated |
|--|--|--|--|
| ZK proof | ❌ None | ✅ snarkjs, shell script | ✅ snarkjs in-process |
| Algorand | ✅ Testnet tx | ❌ None | ✅ Testnet tx with proof fingerprint |
| Frontend inputs | Button only | — | Age + Nationality form |
| Servers | 2 separate | 2 separate | **1 unified on port 5000** |
