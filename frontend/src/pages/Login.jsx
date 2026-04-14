import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loginUser } from "../api";

const MOCK_USERS = [
  { id: "user1", name: "Ayush",  dob: "2004-05-19", color: "#2563EB" },
  { id: "user2", name: "Rahul",  dob: "2010-01-01", color: "#DC2626" },
  { id: "user3", name: "Priya",  dob: "1995-03-15", color: "#7C3AED" },
  { id: "user4", name: "Sneha",  dob: "1988-07-22", color: "#059669" },
  { id: "user5", name: "Vikram", dob: "2006-11-30", color: "#EA580C" },
];

function getAge(dob) {
  const birth = new Date(dob), now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function Login() {
  const [params]   = useSearchParams();
  const [selected, setSelected] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const clientId    = params.get("client_id")    || "mock_client";
  const redirectUri =  params.get("redirect_uri") || "https://zk-pass-vgub.vercel.app/callback";
  const state       = params.get("state")        || "";

  async function handleLogin() {
    if (!selected) { setError("Please select an account to continue."); return; }
    setError(""); setLoading(true);
    try {
      const { sessionId } = await loginUser({ userId: selected, client_id: clientId, redirect_uri: redirectUri, state });
      window.location.href = `/consent?session_id=${sessionId}`;
    } catch (e) {
      setError(e.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #0A1628; --navy-mid: #112240;
          --blue: #1A4B9E; --blue-bright: #2563EB; --blue-pale: #EFF4FF;
          --saffron: #F97316; --green: #16A34A; --text: #0F172A;
          --text-2: #475569; --text-3: #94A3B8; --border: #E2E8F0;
          --surface: #F8FAFC; --white: #FFFFFF;
        }
        body { font-family: 'Sora', sans-serif; background: var(--navy); min-height: 100vh; -webkit-font-smoothing: antialiased; }

        .login-shell {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(160deg, #070F1F 0%, #0A1628 40%, #112240 100%);
        }

        /* Left panel (decorative) */
        .left-panel {
          flex: 1; display: none;
          padding: 48px;
          position: relative; overflow: hidden;
        }
        @media(min-width: 900px) { .left-panel { display: flex; flex-direction: column; } }
        .left-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 40%, rgba(37,99,235,0.15) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(249,115,22,0.08) 0%, transparent 50%);
        }
        .left-grid {
          position: absolute; inset: 0; opacity: 0.05;
          background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .left-content { position: relative; z-index: 1; margin-top: auto; }
        .left-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(37,99,235,0.2); border: 1px solid rgba(37,99,235,0.4);
          color: #93C5FD; font-size: 11px; font-weight: 600;
          padding: 5px 12px; border-radius: 99px; letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 20px;
        }
        .left-badge::before { content: ''; width: 6px; height: 6px; background: #60A5FA; border-radius: 50%; }
        .left-title { font-size: 36px; font-weight: 800; color: white; letter-spacing: -1px; line-height: 1.15; margin-bottom: 16px; }
        .left-title span { color: var(--saffron); }
        .left-desc { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.7; max-width: 340px; }
        .left-footer { position: relative; z-index: 1; margin-top: auto; }
        .left-footer p { font-size: 11px; color: rgba(255,255,255,0.2); }

        /* Right panel (form) */
        .right-panel {
          width: 100%; max-width: 480px;
          background: var(--surface);
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 40px;
          min-height: 100vh;
        }
        @media(max-width: 899px) { .right-panel { max-width: 100%; padding: 32px 24px; } }

        .form-logo { margin-bottom: 32px; }
        .form-logo-icon {
          width: 48px; height: 48px;
          background: var(--navy);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 16px;
        }
        .form-title { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 4px; }
        .form-sub { font-size: 13px; color: var(--text-3); }
        .form-sub strong { color: var(--blue-bright); font-weight: 600; }

        .section-label {
          font-size: 10px; font-weight: 700; color: var(--text-3);
          letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;
        }

        .alert-warn {
          display: flex; gap: 10px; align-items: flex-start;
          background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E;
          padding: 12px 14px; border-radius: 10px;
          font-size: 12px; line-height: 1.5; margin-bottom: 20px;
        }

        /* User cards */
        .user-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .user-card {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-radius: 10px;
          border: 1.5px solid var(--border);
          background: white;
          cursor: pointer; transition: all 0.15s;
        }
        .user-card:hover { border-color: var(--blue-bright); background: var(--blue-pale); }
        .user-card.active {
          border-color: var(--blue-bright);
          background: var(--blue-pale);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .user-avatar {
          width: 38px; height: 38px; flex-shrink: 0;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px; color: white;
        }
        .user-name { font-weight: 600; font-size: 14px; color: var(--text); }
        .user-meta { font-size: 11px; color: var(--text-3); margin-top: 1px; }
        .user-badge {
          margin-left: auto; padding: 3px 10px; border-radius: 99px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px; flex-shrink: 0;
        }
        .user-badge.adult { background: #DCFCE7; color: #14532D; }
        .user-badge.minor { background: #FEF3C7; color: #78350F; }

        .radio-hidden { display: none; }

        .alert-error {
          display: flex; gap: 8px;
          background: #FEF2F2; border: 1px solid #FECACA; color: #7F1D1D;
          padding: 10px 14px; border-radius: 10px;
          font-size: 12px; margin-bottom: 14px;
        }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'Sora', sans-serif; font-weight: 600;
          border-radius: 10px; cursor: pointer; border: none;
          transition: all 0.15s; width: 100%; padding: 13px;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary {
          background: var(--blue-bright); color: white; font-size: 15px;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3); margin-bottom: 10px;
        }
        .btn-primary:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); }
        .btn-ghost {
          background: transparent; color: var(--text-2); font-size: 13px;
          border: 1.5px solid var(--border);
        }
        .btn-ghost:hover { background: var(--surface); }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .form-footer { margin-top: 24px; text-align: center; font-size: 11px; color: var(--text-3); }

        .anim-fade { animation: fadeUp 0.4s ease; }
      `}</style>

      <div className="login-shell">
        {/* Left decorative panel */}
        <div className="left-panel">
          <div className="left-bg" />
          <div className="left-grid" />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🏛️</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
              Citizen Identity Portal
            </div>
          </div>
          <div className="left-content">
            <div className="left-badge">ZK Identity</div>
            <div className="left-title">
              Privacy-first<br/>identity <span>verification</span>
            </div>
            <p className="left-desc">
              Prove who you are without revealing your personal data.
              Zero-Knowledge proofs keep your Date of Birth secret while
              confirming you're an adult Indian citizen.
            </p>
          </div>
          <div className="left-footer">
            <p>Mock DigiLocker · Hackathon Demo · No real Aadhaar data used</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="right-panel">
          <div className="anim-fade">
            <div className="form-logo">
              <div className="form-logo-icon">🔐</div>
              <div className="form-title">Login to DigiLocker</div>
              <div className="form-sub">Requested by: <strong>{clientId}</strong></div>
            </div>

            <div className="alert-warn">
              <span>🛡️</span>
              <div><strong>Mock System</strong> — Select any test user below. No real identity data is used.</div>
            </div>

            <div className="section-label">Select Test Account</div>

            <div className="user-list">
              {MOCK_USERS.map((u) => {
                const age = getAge(u.dob);
                return (
                  <div
                    key={u.id}
                    className={`user-card ${selected === u.id ? "active" : ""}`}
                    onClick={() => { setSelected(u.id); setError(""); }}
                    role="radio"
                    aria-checked={selected === u.id}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(u.id)}
                  >
                    <input className="radio-hidden" type="radio" name="user" value={u.id} checked={selected === u.id} readOnly />
                    <div className="user-avatar" style={{ background: u.color }}>{u.name.charAt(0)}</div>
                    <div>
                      <div className="user-name">{u.name}</div>
                      <div className="user-meta">Age {age} · {age >= 18 ? "Adult" : "Minor"}</div>
                    </div>
                    <span className={`user-badge ${age >= 18 ? "adult" : "minor"}`}>
                      {age >= 18 ? "≥18" : "<18"}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="alert-error">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleLogin} disabled={loading || !selected}>
              {loading ? <><div className="spinner" /> Authenticating…</> : "Continue to Consent →"}
            </button>

            <button className="btn btn-ghost" onClick={() => window.history.back()}>
              ← Cancel
            </button>

            <div className="form-footer">
              Secured by Mock DigiLocker OAuth 2.0 · Sandbox Environment
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
