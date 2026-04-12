import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getConsentInfo, submitConsent } from "../api";

export default function Consent() {
  const [params]  = useSearchParams();
  const sessionId = params.get("session_id");

  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!sessionId) { setError("Missing session. Please start the flow again."); setLoading(false); return; }
    getConsentInfo(sessionId)
      .then(setInfo)
      .catch((e) => setError(e.message || "Invalid or expired session."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleConsent(action) {
    setActing(true);
    try {
      const { redirectUrl } = await submitConsent(sessionId, action);
      window.location.href = redirectUrl;
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setActing(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #0A1628; --blue-bright: #2563EB; --blue-pale: #EFF4FF;
          --saffron: #F97316; --green: #16A34A;
          --text: #0F172A; --text-2: #475569; --text-3: #94A3B8;
          --border: #E2E8F0; --surface: #F8FAFC; --white: #FFFFFF;
        }
        body { font-family: 'Sora', sans-serif; background: var(--surface); -webkit-font-smoothing: antialiased; }

        .page { min-height: 100vh; display: flex; flex-direction: column; }

        /* Top bar */
        .topbar {
          background: var(--navy);
          border-bottom: 3px solid var(--saffron);
          padding: 14px 24px;
          display: flex; align-items: center; gap: 12px;
        }
        .topbar-icon { font-size: 22px; }
        .topbar-title { color: white; font-weight: 700; font-size: 15px; }
        .topbar-sub { color: rgba(255,255,255,0.4); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-top: 1px; }

        /* Center */
        .center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px 24px; }
        .container { width: 100%; max-width: 440px; animation: fadeUp 0.4s ease; }

        /* Card */
        .card { background: white; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.07); }

        .card-hero {
          background: linear-gradient(135deg, #070F1F, var(--navy));
          padding: 24px 28px;
          color: white;
        }
        .card-hero-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .card-hero-icon {
          width: 46px; height: 46px;
          background: rgba(255,255,255,0.12);
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .card-hero-title { font-size: 18px; font-weight: 700; }
        .card-hero-sub { font-size: 11px; opacity: 0.5; margin-top: 2px; }
        .card-hero-requester {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; padding: 10px 14px;
          font-size: 13px; color: rgba(255,255,255,0.8);
        }
        .card-hero-requester strong { color: white; }

        .card-body { padding: 24px; }

        /* User greeting */
        .user-greeting {
          display: flex; align-items: center; gap: 12px;
          background: var(--blue-pale);
          border: 1px solid #BFDBFE;
          border-radius: 10px; padding: 12px 16px;
          margin-bottom: 20px;
        }
        .user-avatar {
          width: 38px; height: 38px;
          background: var(--blue-bright);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 16px; flex-shrink: 0;
        }
        .user-name { font-weight: 600; font-size: 14px; color: var(--text); }
        .user-status { font-size: 11px; color: var(--text-3); margin-top: 2px; }

        .access-label { font-size: 13px; color: var(--text-2); margin-bottom: 12px; }

        /* Scope items */
        .scope-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .scope-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border: 1.5px solid var(--border);
          border-radius: 10px; background: white;
        }
        .scope-icon { font-size: 20px; }
        .scope-name { font-weight: 600; font-size: 13px; color: var(--text); }
        .scope-desc { font-size: 11px; color: var(--text-3); margin-top: 2px; line-height: 1.4; }
        .scope-badge {
          margin-left: auto; flex-shrink: 0;
          padding: 3px 8px; border-radius: 99px;
          font-size: 10px; font-weight: 700;
          background: #EFF6FF; color: var(--blue-bright);
          border: 1px solid #BFDBFE;
        }

        /* Alerts */
        .alert-info {
          display: flex; gap: 10px;
          background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF;
          padding: 12px 14px; border-radius: 10px;
          font-size: 12px; line-height: 1.5; margin-bottom: 20px;
        }
        .alert-error {
          display: flex; gap: 8px;
          background: #FEF2F2; border: 1px solid #FECACA; color: #7F1D1D;
          padding: 12px 14px; border-radius: 10px;
          font-size: 12px; margin-bottom: 16px;
        }

        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'Sora', sans-serif; font-weight: 600;
          border-radius: 10px; cursor: pointer; border: none;
          transition: all 0.15s; width: 100%;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-allow {
          background: var(--green); color: white;
          padding: 13px; font-size: 15px;
          box-shadow: 0 2px 8px rgba(22,163,74,0.3);
          margin-bottom: 10px;
        }
        .btn-allow:hover:not(:disabled) { background: #15803D; transform: translateY(-1px); }
        .btn-deny {
          background: white; color: #DC2626;
          border: 1.5px solid #FECACA;
          padding: 12px; font-size: 13px;
        }
        .btn-deny:hover:not(:disabled) { background: #FEF2F2; border-color: #DC2626; }

        .divider { border: none; border-top: 1px solid var(--border); margin: 18px 0; }
        .fine-print { text-align: center; font-size: 11px; color: var(--text-3); line-height: 1.5; }

        /* Loading */
        .loading { text-align: center; padding: 60px 24px; }
        .spinner {
          width: 36px; height: 36px; margin: 0 auto 16px;
          border: 3px solid var(--border); border-top-color: var(--blue-bright);
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        .loading-text { color: var(--text-3); font-size: 14px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .btn-return {
          display: flex; align-items: center; justify-content: center;
          width: 100%; padding: 12px;
          background: white; border: 1.5px solid var(--border);
          border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 500; color: var(--text-2);
          cursor: pointer; transition: all 0.15s;
        }
        .btn-return:hover { background: var(--surface); color: var(--text); }

        .spinner-sm {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
      `}</style>

      <div className="page">
        {/* Top bar */}
        <div className="topbar">
          <span className="topbar-icon">🏛️</span>
          <div>
            <div className="topbar-title">DigiLocker</div>
            <div className="topbar-sub">Consent Request</div>
          </div>
        </div>

        <div className="center">
          <div className="container">
            {loading ? (
              <div className="loading">
                <div className="spinner" />
                <div className="loading-text">Loading consent details…</div>
              </div>
            ) : error ? (
              <div>
                <div className="alert-error"><span>❌</span><span>{error}</span></div>
                <button className="btn-return" onClick={() => window.location.href = "/"}>← Return to App</button>
              </div>
            ) : (
              <div className="card">
                {/* Card hero */}
                <div className="card-hero">
                  <div className="card-hero-top">
                    <div className="card-hero-icon">🔐</div>
                    <div>
                      <div className="card-hero-title">Share Information</div>
                      <div className="card-hero-sub">DigiLocker Consent Request</div>
                    </div>
                  </div>
                  <div className="card-hero-requester">
                    <strong>{info?.clientId || "mock_client"}</strong> is requesting access to your DigiLocker data
                  </div>
                </div>

                <div className="card-body">
                  {/* User greeting */}
                  <div className="user-greeting">
                    <div className="user-avatar">{info?.userName?.charAt(0)}</div>
                    <div>
                      <div className="user-name">Hello, {info?.userName}</div>
                      <div className="user-status">Logged into DigiLocker</div>
                    </div>
                  </div>

                  <p className="access-label">This app is requesting the following from your Aadhaar:</p>

                  <div className="scope-list">
                    {(info?.scopes || []).map((scope) => (
                      <div className="scope-item" key={scope}>
                        <span className="scope-icon">{scope.includes("Birth") ? "🗓️" : "🇮🇳"}</span>
                        <div>
                          <div className="scope-name">{scope}</div>
                          <div className="scope-desc">
                            {scope.includes("Birth")
                              ? "Used only to calculate age — deleted immediately after proof"
                              : "Confirms you hold Indian citizenship"}
                          </div>
                        </div>
                        <span className="scope-badge">Required</span>
                      </div>
                    ))}
                  </div>

                  <div className="alert-info">
                    <span>🔒</span>
                    <div>Your <strong>Date of Birth is deleted immediately</strong> after age calculation. Only boolean claims are stored in the ZK proof.</div>
                  </div>

                  <button className="btn btn-allow" onClick={() => handleConsent("allow")} disabled={acting}>
                    {acting ? <><div className="spinner-sm" /> Processing…</> : "✅ Allow Access"}
                  </button>
                  <button className="btn btn-deny" onClick={() => handleConsent("deny")} disabled={acting}>
                    ❌ Deny Access
                  </button>

                  <div className="divider" />
                  <p className="fine-print">
                    By clicking Allow, you agree to share the above data with this application.<br />
                    You can revoke access at any time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
