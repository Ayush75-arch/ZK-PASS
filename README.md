# ZK-KYC Merged Project

This is a merged project for the Algorand Bharat Hackathon: Zero-Knowledge KYC Verification System.

## Overview
- **Frontend**: React app with Pera wallet integration, DOB input for selective disclosure.
- **Backend**: Express server combining ZK proof generation/verification with Algorand blockchain storage.
- **ZK Proof**: Uses Circom circuit to prove age >= 18 without revealing DOB.
- **Blockchain**: Stores proof hash and flags on Algorand testnet via user-signed transactions.

## Setup

### Backend
1. `cd backend`
2. `npm install`
3. Create `.env` with `MNEMONIC=your_25_word_mnemonic`
4. `npm start` (runs on port 5000)

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm start` (runs on port 3000)

## Flow
1. User connects Pera wallet.
2. Enters DOB and nationality.
3. Frontend calls `/generate-proof` → generates ZK proof for age.
4. Calls `/verify-proof` → verifies proof.
5. Calls `/prepare-txn` → gets unsigned Algorand transaction.
6. Signs transaction with Pera wallet.
7. Calls `/send-txn` → sends signed txn to Algorand.
8. Shows txId for verification.

## Files
- `backend/zkServer.js`: Main server with ZK + Algorand logic.
- `backend/circuits/age.circom`: ZK circuit for age check.
- `frontend/src/App.js`: UI with wallet and proof flow.

## Demo
- Start backend and frontend.
- Connect wallet, enter DOB (e.g., 2000-01-01), nationality India.
- Click "Generate Proof & Verify" → gets txId on Algorand testnet.