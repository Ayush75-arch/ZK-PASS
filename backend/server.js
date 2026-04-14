require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// ── CORS CONFIG (FINAL) ────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://zk-pass-vgub.vercel.app" // 🔁 REPLACE THIS with your actual Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ── MIDDLEWARE ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, _res, next) => {
  console.log(`${req.method.padEnd(6)} ${req.path}`);
  next();
});

// ── ROUTES ────────────────────────────────────────────────────────────
const { router: oauthRouter } = require("./routes/oauth");
const documentsRouter = require("./routes/documents");
const zkRouter = require("./routes/zk");

app.use("/", oauthRouter);
app.use("/documents", documentsRouter);
app.use("/zk", zkRouter);

// ── HEALTH CHECK ──────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "ZK-PASS + DigiLocker Integrated",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// ── 404 HANDLER ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

// ── START SERVER ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     🔐  ZK-PASS + DigiLocker Integrated Backend          ║
╚══════════════════════════════════════════════════════════╝

  Server   →  http://localhost:${PORT}
  Health   →  http://localhost:${PORT}/health

  🚀 LIVE Backend (Render):
  https://zk-pass.onrender.com
`);
});