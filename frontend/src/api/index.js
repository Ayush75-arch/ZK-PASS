const BACKEND = "http://localhost:3001";

// ── OAuth ─────────────────────────────────────────────────────────────────────

export async function loginUser({ userId, client_id, redirect_uri, state }) {
  const res = await fetch(`${BACKEND}/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ userId, client_id, redirect_uri, state }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Login failed");
  return res.json();
}

export async function getConsentInfo(sessionId) {
  const res = await fetch(`${BACKEND}/consent-info?session_id=${sessionId}`);
  if (!res.ok) throw new Error((await res.json()).error || "Session invalid");
  return res.json();
}

export async function submitConsent(sessionId, action) {
  const res = await fetch(`${BACKEND}/consent`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ session_id: sessionId, action }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Consent failed");
  return res.json();
}

export async function exchangeCodeForToken(code) {
  const res = await fetch(`${BACKEND}/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ code, client_id: "zkpass_client", grant_type: "authorization_code" }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Token exchange failed");
  return res.json();
}

export async function revokeToken(token) {
  await fetch(`${BACKEND}/token`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getTokenStatus(token) {
  const res = await fetch(`${BACKEND}/token-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function fetchAadhaar(token) {
  const res = await fetch(`${BACKEND}/documents/aadhaar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch document");
  return res.json();
}

// ── ZK Proofs ─────────────────────────────────────────────────────────────────

export async function generateProof(token) {
  const res = await fetch(`${BACKEND}/zk/generate-proof`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  // 403 means circuit constraints not satisfied — return data so UI can display reason
  if (res.status === 403) return data;
  if (!res.ok) throw new Error(data.error || "Proof generation failed");
  return data;
}

export async function verifyProof({ proof, publicSignals }) {
  const res = await fetch(`${BACKEND}/zk/verify-proof`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ proof, publicSignals }),
  });
  return res.json();
}
