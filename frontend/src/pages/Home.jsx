import { useState, useEffect } from "react";
import { revokeToken, getTokenStatus, verifyProof } from "../api";

const BACKEND      = "import.meta.env.VITE_API_URL";
const CLIENT_ID    = "zkpass_client";
const REDIRECT_URI = "https://zk-pass-vgub.vercel.app/callback";

console.log("ENV CHECK:", import.meta.env.VITE_API_URL);

export default function Home() {
  const [proof,      setProof]      = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("zkProof") || "null"); } catch { return null; }
  });
  const [token,      setToken]      = useState(() => sessionStorage.getItem("accessToken") || null);
  const [tokenInfo,  setTokenInfo]  = useState(null);
  const [verifying,  setVerifying]  = useState(false);
  const [reVerified, setReVerified] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const info = await getTokenStatus(token);
      if (!cancelled) setTokenInfo(info);
    })();
    const id = setInterval(async () => {
      const info = await getTokenStatus(token);
      if (!cancelled) setTokenInfo(info);
    }, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [token]);

  function startOAuth() {
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem("oauthState", state);
    const url = new URL(`${BACKEND}/authorize`);
    url.searchParams.set("client_id",     CLIENT_ID);
    url.searchParams.set("redirect_uri",  REDIRECT_URI);
    url.searchParams.set("state",         state);
    url.searchParams.set("response_type", "code");
    window.location.href = url.toString();
  }

  async function handleLogout() {
    if (token) await revokeToken(token);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("zkProof");
    setToken(null); setProof(null); setTokenInfo(null); setReVerified(null);
  }

  async function handleReVerify() {
    if (!proof) return;
    setVerifying(true); setReVerified(null);
    const result = await verifyProof({
      proof:         proof.proof,
      publicSignals: proof.publicSignals,
    });
    setReVerified(result);
    setVerifying(false);
  }

  const isVerified = !!proof && proof.zkVerified === true;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #0A1628; --navy-mid: #112240;
          --blue: #1A4B9E; --blue-bright: #2563EB; --blue-pale: #EFF4FF;
          --saffron: #F97316; --green: #16A34A; --green-pale: #F0FDF4;
          --red: #DC2626; --red-pale: #FEF2F2;
          --text: #0F172A; --text-2: #475569; --text-3: #94A3B8;
          --border: #E2E8F0; --surface: #F8FAFC; --white: #FFFFFF;
          --radius: 12px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
        }
        body { font-family: 'Sora', sans-serif; background: var(--surface); color: var(--text); -webkit-font-smoothing: antialiased; }

        /* ── NAV ── */
        .nav { background: var(--navy); position: sticky; top: 0; z-index: 100; border-bottom: 3px solid var(--saffron); }
        .nav-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; gap: 14px; }
        .nav-emblem { width: 38px; height: 38px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .nav-title { color: white; font-weight: 700; font-size: 15px; letter-spacing: -0.2px; }
        .nav-sub { color: rgba(255,255,255,0.45); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-top: 1px; }
        .nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
        .token-pill { background: rgba(22,163,74,0.2); border: 1px solid rgba(22,163,74,0.4); color: #86EFAC; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px; display: flex; align-items: center; gap: 5px; }
        .token-pill::before { content: ''; width: 6px; height: 6px; background: #4ADE80; border-radius: 50%; animation: blink 2s ease infinite; }
        .nav-timer { color: rgba(255,255,255,0.4); font-size: 11px; font-family: 'IBM Plex Mono', monospace; }
        .nav-logout { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); padding: 6px 14px; border-radius: 8px; font-size: 12px; font-family: 'Sora', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .nav-logout:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.4); color: white; }

        /* ── LAYOUT ── */
        .page-wrap { max-width: 680px; margin: 0 auto; padding: 40px 24px 60px; }

        /* ── HERO ── */
        .hero { text-align: center; margin-bottom: 36px; animation: fadeUp 0.5s ease; }
        .hero-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: var(--blue-pale); border: 2px solid #BFDBFE; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; }
        .hero h1 { font-size: 30px; font-weight: 800; color: var(--text); letter-spacing: -0.8px; margin-bottom: 10px; }
        .hero p { font-size: 16px; color: var(--text-2); line-height: 1.6; max-width: 440px; margin: 0 auto; }

        /* ── CARDS ── */
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-sm); overflow: hidden; margin-bottom: 20px; }
        .card-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
        .card-header-icon { width: 34px; height: 34px; background: var(--blue-pale); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .card-header-title { font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: 0.3px; }
        .card-header-sub { font-size: 11px; color: var(--text-3); margin-top: 1px; }
        .card-body { padding: 24px; }

        /* ── HOW IT WORKS ── */
        .steps { display: flex; flex-direction: column; gap: 16px; }
        .step { display: flex; gap: 14px; align-items: flex-start; }
        .step-num { width: 30px; height: 30px; flex-shrink: 0; background: var(--blue-pale); border: 1.5px solid #BFDBFE; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--blue); }
        .step-title { font-weight: 600; font-size: 14px; color: var(--text); }
        .step-desc { font-size: 12px; color: var(--text-3); margin-top: 2px; line-height: 1.5; }

        /* ── BUTTONS ── */
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: 'Sora', sans-serif; font-weight: 600; border-radius: 10px; cursor: pointer; border: none; transition: all 0.15s; text-decoration: none; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--blue-bright); color: white; padding: 13px 22px; font-size: 15px; box-shadow: 0 2px 8px rgba(37,99,235,0.35); }
        .btn-primary:hover:not(:disabled) { background: #1D4ED8; box-shadow: 0 4px 16px rgba(37,99,235,0.45); transform: translateY(-1px); }
        .btn-outline { background: white; color: var(--text); border: 1.5px solid var(--border); padding: 11px 18px; font-size: 13px; }
        .btn-outline:hover:not(:disabled) { border-color: var(--blue-bright); color: var(--blue-bright); background: var(--blue-pale); }
        .btn-ghost { background: transparent; color: var(--text-2); border: 1.5px solid var(--border); padding: 11px 18px; font-size: 13px; }
        .btn-ghost:hover:not(:disabled) { background: var(--surface); color: var(--text); }
        .btn-full { width: 100%; }

        /* ── ALERTS ── */
        .alert { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border-radius: 10px; font-size: 13px; line-height: 1.5; }
        .alert-warn { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; }
        .alert-info { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; }
        .alert-success { background: var(--green-pale); border: 1px solid #BBF7D0; color: #14532D; }
        .alert-error { background: var(--red-pale); border: 1px solid #FECACA; color: #7F1D1D; }

        /* ── SUCCESS BANNER ── */
        .success-banner { background: linear-gradient(135deg, #14532D, var(--green)); border-radius: 16px; padding: 28px 32px; color: white; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; animation: fadeUp 0.4s ease; }
        .success-icon { width: 64px; height: 64px; flex-shrink: 0; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; animation: checkPop 0.5s ease; }
        .success-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .success-sub { opacity: 0.75; font-size: 13px; margin-top: 4px; }

        /* ── CLAIM GRID ── */
        .claim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .claim-card { border-radius: 12px; padding: 18px; text-align: center; border: 1.5px solid; }
        .claim-card.true  { background: var(--green-pale); border-color: #BBF7D0; }
        .claim-card.false { background: var(--red-pale); border-color: #FECACA; }
        .claim-emoji { font-size: 26px; margin-bottom: 8px; }
        .claim-value { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
        .claim-card.true  .claim-value { color: var(--green); }
        .claim-card.false .claim-value { color: var(--red); }
        .claim-label { font-size: 11px; color: var(--text-3); margin-top: 4px; letter-spacing: 0.3px; }

        /* ── PROOF DETAILS ── */
        .proof-details { background: var(--surface); border-radius: 10px; padding: 16px 18px; }
        .proof-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--border); gap: 20px; }
        .proof-row:last-child { border-bottom: none; }
        .proof-key { color: var(--text-3); flex-shrink: 0; font-weight: 500; }
        .proof-val { color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 11px; text-align: right; word-break: break-all; }
        .proof-val a { color: var(--blue-bright); text-decoration: none; }
        .proof-val a:hover { text-decoration: underline; }

        /* ── AUDIT TRAIL ── */
        .audit-row { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .audit-row:last-child { border-bottom: none; }
        .audit-icon { font-size: 15px; margin-top: 1px; }
        .audit-label { color: var(--text-3); min-width: 160px; font-size: 12px; }
        .audit-val { font-weight: 600; font-size: 12px; }
        .audit-val.good { color: var(--green); }
        .audit-val.bad  { color: var(--red); }

        /* ── RAW PROOF ── */
        details summary { cursor: pointer; font-size: 12px; color: var(--blue-bright); user-select: none; padding: 4px 0; }
        details pre { font-size: 10px; color: var(--text-2); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-top: 8px; overflow-x: auto; max-height: 180px; overflow-y: auto; font-family: 'IBM Plex Mono', monospace; }

        /* ── SECTION LABEL ── */
        .section-label { font-size: 10px; font-weight: 700; color: var(--text-3); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }

        /* ── SPINNER ── */
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
        .spinner-dark { border-color: rgba(0,0,0,0.15); border-top-color: var(--blue-bright); }

        /* ── ACTION ROW ── */
        .action-row { display: flex; gap: 12px; margin-bottom: 12px; }

        .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

        /* ── FOOTER ── */
        .footer { text-align: center; padding: 20px; font-size: 11px; color: var(--text-3); border-top: 1px solid var(--border); background: white; }
        .footer a { color: var(--blue-bright); text-decoration: none; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes checkPop { 0% { transform: scale(0); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-emblem">🏛️</div>
          <div>
            <div className="nav-title">ZK-PASS · Citizen Identity Portal</div>
            <div className="nav-sub">ZK Identity · Algorand</div>
          </div>
          {token && tokenInfo?.valid && (
            <div className="nav-right">
              <div className="token-pill">Verified</div>
              <span className="nav-timer">{Math.floor(tokenInfo.expiresIn / 60)}m left</span>
              <button className="nav-logout" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </nav>

      <main>
        <div className="page-wrap">
          {!isVerified ? (

            /* ── UNVERIFIED ── */
            <div style={{ animation: "fadeUp 0.5s ease" }}>
              <div className="hero">
                <div className="hero-icon">🆔</div>
                <h1>Verify Your Identity</h1>
                <p>
                  Prove you're an adult Indian citizen using real Zero-Knowledge proofs
                  (Groth16 / Circom) — anchored on Algorand Testnet — without revealing your Date of Birth.
                </p>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-header-icon">📋</div>
                  <div>
                    <div className="card-header-title">How it works</div>
                    <div className="card-header-sub">5-step privacy-preserving flow</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="steps">
                    {[
                      ["1", "Login via Mock DigiLocker",     "Select a mock user and authenticate via OAuth 2.0"],
                      ["2", "Grant Consent",                 "Allow the app to access DOB & Nationality from your Aadhaar"],
                      ["3", "Real ZK Proof Generated",       "Groth16 / snarkjs circuit proves age ≥ 18 AND Indian — DOB deleted immediately"],
                      ["4", "Anchored on Algorand Testnet",  "Proof hash stored on-chain for transparent auditability"],
                      ["5", "Verified ✓",                    "Only boolean claims (isAdult, isIndian) are exposed — never your raw DOB"],
                    ].map(([n, title, desc]) => (
                      <div className="step" key={n}>
                        <div className="step-num">{n}</div>
                        <div>
                          <div className="step-title">{title}</div>
                          <div className="step-desc">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={startOAuth} style={{ marginBottom: 14 }}>
                🔐 Verify via DigiLocker
              </button>

              <div className="alert alert-warn">
                <span>⚠️</span>
                <span>This is a <strong>mock system</strong> for demonstration. No real Aadhaar data is used. ZK proofs and Algorand transactions are real.</span>
              </div>
            </div>

          ) : (

            /* ── VERIFIED ── */
            <div style={{ animation: "fadeUp 0.4s ease" }}>

              {/* Success Banner */}
              <div className="success-banner">
                <div className="success-icon">✅</div>
                <div>
                  <div className="success-title">Identity Verified</div>
                  <div className="success-sub">
                    Groth16 ZK proof generated at {new Date(proof.generatedAt).toLocaleTimeString()}
                    {proof.txId && " · Anchored on Algorand"}
                  </div>
                </div>
              </div>

              {/* Public Claims */}
              <div className="card">
                <div className="card-header">
                  <div className="card-header-icon">🧮</div>
                  <div>
                    <div className="card-header-title">ZK Public Signals</div>
                    <div className="card-header-sub">Verifiable claims — no raw PII exposed</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="claim-grid">
                    <div className={`claim-card ${proof.publicClaims?.isAdult ? "true" : "false"}`}>
                      <div className="claim-emoji">{proof.publicClaims?.isAdult ? "✅" : "❌"}</div>
                      <div className="claim-value">{proof.publicClaims?.isAdult ? "TRUE" : "FALSE"}</div>
                      <div className="claim-label">Is Adult (age ≥ 18)</div>
                    </div>
                    <div className={`claim-card ${proof.publicClaims?.isIndian ? "true" : "false"}`}>
                      <div className="claim-emoji">{proof.publicClaims?.isIndian ? "🇮🇳" : "❌"}</div>
                      <div className="claim-value">{proof.publicClaims?.isIndian ? "TRUE" : "FALSE"}</div>
                      <div className="claim-label">Is Indian Citizen</div>
                    </div>
                  </div>

                  <div className="section-label">Proof Details</div>
                  <div className="proof-details">
                    {[
                      ["Algorithm",       proof.algorithm || "Groth16 (snarkjs)"],
                      ["Proof Type",      proof.publicClaims?.proofType || "age_nationality_v1"],
                      ["Public Signals",  proof.publicSignals?.join(", ") || "—"],
                      ["SHA-256 Hash",    proof.hash || "—"],
                    ].map(([k, v]) => (
                      <div className="proof-row" key={k}>
                        <span className="proof-key">{k}</span>
                        <span className="proof-val">{v}</span>
                      </div>
                    ))}
                    {proof.txId && (
                      <div className="proof-row">
                        <span className="proof-key">Algorand TX</span>
                        <span className="proof-val">
                          <a href={`https://lora.algokit.io/testnet/transaction/${proof.txId}`} target="_blank" rel="noreferrer">
                            {proof.txId.slice(0, 20)}…
                          </a>
                        </span>
                      </div>
                    )}
                    {!proof.txId && (
                      <div className="proof-row">
                        <span className="proof-key">Algorand TX</span>
                        <span className="proof-val" style={{ color: "#94A3B8" }}>Skipped (MNEMONIC not set)</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <details>
                      <summary>View raw ZK proof</summary>
                      <pre>{JSON.stringify(proof.proof, null, 2)}</pre>
                    </details>
                    <details style={{ marginTop: 8 }}>
                      <summary>View public signals array</summary>
                      <pre>{JSON.stringify(proof.publicSignals, null, 2)}</pre>
                    </details>
                  </div>
                </div>
              </div>

              {/* Privacy Audit */}
              <div className="card">
                <div className="card-header">
                  <div className="card-header-icon">🔒</div>
                  <div>
                    <div className="card-header-title">Privacy Audit Trail</div>
                    <div className="card-header-sub">What data was used and when it was deleted</div>
                  </div>
                </div>
                <div className="card-body">
                  {proof.privacyAudit && (
                    <>
                      <div className="audit-row">
                        <span className="audit-icon">🗑️</span>
                        <span className="audit-label">DOB stored on server?</span>
                        <span className={`audit-val ${proof.privacyAudit.dobStored ? "bad" : "good"}`}>
                          {proof.privacyAudit.dobStored ? "YES" : "NO — Never persisted"}
                        </span>
                      </div>
                      <div className="audit-row">
                        <span className="audit-icon">📋</span>
                        <span className="audit-label">DOB used for</span>
                        <span className="audit-val good">{proof.privacyAudit.dobUsedFor}</span>
                      </div>
                      <div className="audit-row">
                        <span className="audit-icon">⏱️</span>
                        <span className="audit-label">DOB deleted at</span>
                        <span className="audit-val good">{new Date(proof.privacyAudit.dobDeletedAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="audit-row">
                        <span className="audit-icon">✅</span>
                        <span className="audit-label">Data in proof</span>
                        <span className="audit-val good">{proof.privacyAudit.dataInProof?.join(", ")}</span>
                      </div>
                      <div className="audit-row">
                        <span className="audit-icon">🚫</span>
                        <span className="audit-label">NOT in proof</span>
                        <span className="audit-val good">{proof.privacyAudit.dataNotInProof?.join(", ")}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Re-verify result */}
              {reVerified && (
                <div className={`alert ${reVerified.verified ? "alert-success" : "alert-error"}`} style={{ marginBottom: 12 }}>
                  <span>{reVerified.verified ? "✅" : "❌"}</span>
                  <span>{reVerified.message || (reVerified.verified ? "Proof is valid" : "Proof is invalid")}</span>
                </div>
              )}

              {/* Actions */}
              <div className="action-row">
                <button className="btn btn-outline" onClick={handleReVerify} disabled={verifying} style={{ flex: 1 }}>
                  {verifying ? <><div className="spinner spinner-dark" /> Verifying…</> : "🔍 Re-verify Proof"}
                </button>
                <button className="btn btn-ghost" onClick={handleLogout} style={{ flex: 1 }}>
                  🔄 Reset / Logout
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button className="btn btn-primary" onClick={startOAuth}>
                  🔐 Verify with a Different User
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        ZK-PASS · Groth16 / snarkjs · Algorand Testnet · Mock DigiLocker OAuth 2.0 ·{" "}
        <a href="http://localhost:3001/health" target="_blank" rel="noreferrer">Backend Health ↗</a>
      </footer>
    </>
  );
}
