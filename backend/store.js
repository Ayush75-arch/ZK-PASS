/**
 * In-memory store — no database required.
 * All state resets on server restart.
 */

// ─── Mock Users (DigiLocker) ────────────────────────────────────────────────
const users = {
  user1: { name: "Ayush",  dob: "2004-05-19", isIndian: 1 },
  user2: { name: "Rahul",  dob: "2010-01-01", isIndian: 1 },
  user3: { name: "Priya",  dob: "1995-03-15", isIndian: 1 },
  user4: { name: "Sneha",  dob: "1988-07-22", isIndian: 1 },
  user5: { name: "Vikram", dob: "2006-11-30", isIndian: 1 },
};

// ─── OAuth State Stores ─────────────────────────────────────────────────────
// sessionId  →  { userId, client_id, redirect_uri, state, createdAt }
const sessions = new Map();

// authCode   →  { userId, client_id, createdAt }
const authCodes = new Map();

// accessToken →  { userId, createdAt, expiresIn }
const tokens = new Map();

// ─── Cleanup helpers ────────────────────────────────────────────────────────
function purgeExpired() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > 30 * 60 * 1000) sessions.delete(id);
  }
  for (const [code, c] of authCodes.entries()) {
    if (now - c.createdAt > 10 * 60 * 1000) authCodes.delete(code);
  }
  for (const [token, t] of tokens.entries()) {
    if ((now - t.createdAt) / 1000 > t.expiresIn) tokens.delete(token);
  }
}

setInterval(purgeExpired, 5 * 60 * 1000);

module.exports = { users, sessions, authCodes, tokens };
