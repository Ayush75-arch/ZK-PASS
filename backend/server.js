require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin:         ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials:    true,
  methods:        ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`  ${req.method.padEnd(6)} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
const { router: oauthRouter } = require("./routes/oauth");
const documentsRouter         = require("./routes/documents");
const zkRouter                = require("./routes/zk");

app.use("/",          oauthRouter);
app.use("/documents", documentsRouter);
app.use("/zk",        zkRouter);

// Health check
app.get("/health", (_req, res) =>
  res.json({ status: "OK", service: "ZK-PASS + DigiLocker Integrated", version: "1.0.0", timestamp: new Date().toISOString() })
);

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     🔐  ZK-PASS + DigiLocker  Integrated Backend         ║
╚══════════════════════════════════════════════════════════╝

  Server   →  http://localhost:${PORT}
  Health   →  http://localhost:${PORT}/health

  DigiLocker OAuth:
    GET  /authorize           Entry point — redirects to /login UI
    POST /login               Authenticate mock user → session
    GET  /consent-info        Consent screen data
    POST /consent             Allow / deny → auth code redirect
    POST /token               Exchange code → access_token
    DELETE /token             Logout / revoke
    GET  /token-status        Check token validity

  Protected Documents API:
    GET  /documents/aadhaar   Fetch mock Aadhaar (requires Bearer token)
    GET  /documents/list      List available documents

  ZK Proof API:
    POST /zk/generate-proof   OAuth-gated — REAL Groth16 proof + Algorand anchor
    POST /zk/verify-proof     Standalone proof verifier

  ⚠️  Mock DigiLocker — not real Aadhaar data.
  ✅  Real ZK proofs via snarkjs + Circom.
  ⛓️  Algorand Testnet anchoring (set MNEMONIC in .env to enable).
`);
});
