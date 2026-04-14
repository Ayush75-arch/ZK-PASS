const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { users, sessions, authCodes, tokens } = require("../store");

// ──────────────────────────────────────────────────────────────────────────────
// GET /authorize
// Entry point for OAuth flow — validates params, redirects to login UI.
// ──────────────────────────────────────────────────────────────────────────────
router.get("/authorize", (req, res) => {
  const { client_id, redirect_uri, state, response_type = "code" } = req.query;

  if (!client_id)    return res.status(400).json({ error: "missing_client_id" });
  if (!redirect_uri) return res.status(400).json({ error: "missing_redirect_uri" });
  if (response_type !== "code")
    return res.status(400).json({ error: "unsupported_response_type" });

  const loginUrl = new URL("https://zk-pass-vgub.vercel.app/login");
  loginUrl.searchParams.set("client_id",    client_id);
  loginUrl.searchParams.set("redirect_uri", redirect_uri);
  loginUrl.searchParams.set("state",        state || "");

  console.log(`[OAuth] /authorize → client_id=${client_id}`);
  res.redirect(loginUrl.toString());
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /login
// Frontend sends selected userId + OAuth params; creates a session.
// ──────────────────────────────────────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { userId, client_id, redirect_uri, state } = req.body;

  if (!users[userId])
    return res.status(401).json({ error: "invalid_user", message: "User not found" });

  const sessionId = crypto.randomBytes(24).toString("hex");
  sessions.set(sessionId, {
    userId,
    client_id,
    redirect_uri,
    state: state || "",
    createdAt: Date.now(),
  });

  console.log(`[OAuth] Session created  user=${userId}`);
  res.json({ sessionId, userName: users[userId].name });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /consent-info
// Returns session data the consent UI needs (no PII).
// ──────────────────────────────────────────────────────────────────────────────
router.get("/consent-info", (req, res) => {
  const session = sessions.get(req.query.session_id);
  if (!session) return res.status(400).json({ error: "invalid_session" });

  if (Date.now() - session.createdAt > 15 * 60 * 1000) {
    sessions.delete(req.query.session_id);
    return res.status(400).json({ error: "session_expired" });
  }

  res.json({
    userName:  users[session.userId].name,
    clientId:  session.client_id,
    scopes:    ["Date of Birth", "Nationality (Indian Citizen)"],
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /consent
// User allows or denies access. On allow → generate auth code → redirect.
// ──────────────────────────────────────────────────────────────────────────────
router.post("/consent", (req, res) => {
  const { session_id, action } = req.body;
  const session = sessions.get(session_id);

  if (!session) return res.status(400).json({ error: "invalid_session" });
  sessions.delete(session_id);

  if (action === "deny") {
    const url = new URL(session.redirect_uri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("error_description", "The user denied access");
    if (session.state) url.searchParams.set("state", session.state);
    console.log(`[OAuth] Consent DENIED  user=${session.userId}`);
    return res.json({ redirectUrl: url.toString(), denied: true });
  }

  const code = crypto.randomBytes(24).toString("hex");
  authCodes.set(code, {
    userId:    session.userId,
    client_id: session.client_id,
    createdAt: Date.now(),
  });

  const url = new URL(session.redirect_uri);
  url.searchParams.set("code", code);
  if (session.state) url.searchParams.set("state", session.state);

  console.log(`[OAuth] Consent ALLOWED  user=${session.userId}`);
  res.json({ redirectUrl: url.toString() });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /token
// Exchange auth code for access token. Single-use, expires in 5 min.
// ──────────────────────────────────────────────────────────────────────────────
router.post("/token", (req, res) => {
  const { code, client_id, grant_type } = req.body;

  if (grant_type !== "authorization_code")
    return res.status(400).json({ error: "unsupported_grant_type" });

  const authCode = authCodes.get(code);
  if (!authCode)
    return res.status(400).json({ error: "invalid_grant", error_description: "Code is invalid or already used" });

  if (Date.now() - authCode.createdAt > 5 * 60 * 1000) {
    authCodes.delete(code);
    return res.status(400).json({ error: "invalid_grant", error_description: "Code has expired" });
  }

  authCodes.delete(code);

  const accessToken = "dlt_" + crypto.randomBytes(32).toString("hex");
  tokens.set(accessToken, {
    userId:    authCode.userId,
    createdAt: Date.now(),
    expiresIn: 3600,
  });

  console.log(`[OAuth] Token issued  user=${authCode.userId}`);
  res.json({
    access_token: accessToken,
    token_type:   "Bearer",
    expires_in:   3600,
    scope:        "dob nationality",
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /token  (logout / revoke)
// ──────────────────────────────────────────────────────────────────────────────
router.delete("/token", (req, res) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    tokens.delete(auth.slice(7));
  }
  res.json({ success: true, message: "Token revoked." });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /token-status  (for UI badge)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/token-status", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.json({ valid: false });

  const t = tokens.get(auth.slice(7));
  if (!t) return res.json({ valid: false });

  const elapsed = (Date.now() - t.createdAt) / 1000;
  if (elapsed > t.expiresIn) {
    tokens.delete(auth.slice(7));
    return res.json({ valid: false, reason: "expired" });
  }

  res.json({ valid: true, userId: t.userId, expiresIn: Math.floor(t.expiresIn - elapsed) });
});

// ──────────────────────────────────────────────────────────────────────────────
// Shared token validator — used by other route files
// ──────────────────────────────────────────────────────────────────────────────
function validateToken(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return void res.status(401).json({ error: "missing_token" });

  const token = auth.slice(7);
  const t = tokens.get(token);
  if (!t) return void res.status(401).json({ error: "invalid_token" });

  if ((Date.now() - t.createdAt) / 1000 > t.expiresIn) {
    tokens.delete(token);
    return void res.status(401).json({ error: "token_expired" });
  }

  return t;
}

module.exports = { router, validateToken };
