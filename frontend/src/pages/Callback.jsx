import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { exchangeCodeForToken, fetchAadhaar, generateProof } from "../api";

const STEPS = [
  { id: "exchange", label: "Exchanging authorization code",   detail: "POST /token",             emoji: "🔑" },
  { id: "fetch",    label: "Fetching Aadhaar document",       detail: "GET /documents/aadhaar",  emoji: "📄" },
  { id: "zk",       label: "Generating Groth16 ZK proof",     detail: "POST /zk/generate-proof", emoji: "🧮" },
  { id: "purge",    label: "Purging sensitive data (DOB)",    detail: "In-memory wipe",          emoji: "🗑️" },
  { id: "algo",     label: "Anchoring on Algorand Testnet",   detail: "Transaction broadcast",   emoji: "⛓️" },
  { id: "done",     label: "Verification complete",           detail: "Redirecting to app…",     emoji: "✅" },
];

export default function Callback() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const ran       = useRef(false);

  const [currentStep, setCurrentStep] = useState(-1);
  const [stepStatus,  setStepStatus]  = useState({});
  const [error,       setError]       = useState("");
  const [proofData,   setProofData]   = useState(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code  = params.get("code");
    const state = params.get("state");
    const err   = params.get("error");

    if (err) { setError(`Access denied: ${params.get("error_description") || "User denied consent"}`); return; }
    if (!code) { setError("No authorization code received."); return; }

    const savedState = sessionStorage.getItem("oauthState");
    if (savedState && state !== savedState) { setError("State mismatch — possible CSRF attack."); return; }
    sessionStorage.removeItem("oauthState");

    runFlow(code);
  }, []);

  async function runFlow(code) {
    try {
      // Step 0: exchange code
      setCurrentStep(0); await delay(400);
      const { access_token } = await exchangeCodeForToken(code);
      sessionStorage.setItem("accessToken", access_token);
      setStepStatus(s => ({ ...s, exchange: "done" }));

      // Step 1: fetch Aadhaar
      setCurrentStep(1); await delay(300);
      await fetchAadhaar(access_token);
      setStepStatus(s => ({ ...s, fetch: "done" }));

      // Step 2: generate ZK proof (real Groth16 + Algorand on backend)
      setCurrentStep(2);
      const proof = await generateProof(access_token);
      setProofData(proof);

      // If identity failed circuit constraints, stop — don't store or redirect
      if (!proof.zkVerified) {
        setStepStatus(s => ({ ...s, zk: "failed" }));
        setError(proof.message || "Identity does not meet ZK circuit requirements.");
        return;
      }
      setStepStatus(s => ({ ...s, zk: "done" }));

      // Step 3: DOB purge (happens server-side, just show it)
      setCurrentStep(3); await delay(600);
      setStepStatus(s => ({ ...s, purge: "done" }));

      // Step 4: Algorand
      setCurrentStep(4); await delay(400);
      setStepStatus(s => ({ ...s, algo: proof.txId ? "done" : "skipped" }));

      // Step 5: done
      setCurrentStep(5);
      sessionStorage.setItem("zkProof", JSON.stringify(proof));
      setStepStatus(s => ({ ...s, done: "done" }));

      await delay(1200);
      navigate("/");
    } catch (e) {
      setError(e.message || "An unexpected error occurred.");
    }
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const isError = !!error;
  const isDone  = stepStatus.done === "done";
  const progress = Object.values(stepStatus).filter(v => v === "done" || v === "skipped" || v === "failed").length;
  const progressPct = (progress / STEPS.length) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sora', sans-serif; background: #070F1F; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        .shell { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px 24px;
          background: radial-gradient(ellipse at 20% 20%, rgba(37,99,235,0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 80%, rgba(22,163,74,0.06) 0%, transparent 40%), #070F1F; }
        .card { width: 100%; max-width: 480px; animation: fadeUp 0.5s ease; }
        .header { text-align: center; margin-bottom: 28px; }
        .header-icon { width: 68px; height: 68px; margin: 0 auto 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .header-title { font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.5px; margin-bottom: 4px; }
        .header-sub { font-size: 13px; color: rgba(255,255,255,0.35); }
        .progress-wrap { background: rgba(255,255,255,0.06); border-radius: 99px; height: 3px; margin-bottom: 8px; }
        .progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #2563EB, #16A34A); transition: width 0.5s ease; }
        .progress-label { text-align: right; font-size: 10px; color: rgba(255,255,255,0.25); font-family: 'IBM Plex Mono', monospace; margin-bottom: 20px; }
        .steps-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; margin-bottom: 16px; }
        .steps-body { padding: 20px 20px 4px; }
        .step { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 18px; transition: opacity 0.3s; }
        .step.pending { opacity: 0.25; } .step.active { opacity: 1; } .step.done { opacity: 1; } .step.skipped { opacity: 0.5; } .step.failed { opacity: 1; }
        .step-indicator { width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s; border: 2px solid; }
        .step-indicator.pending { border-color: rgba(255,255,255,0.12); background: transparent; }
        .step-indicator.active  { border-color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.08); }
        .step-indicator.done    { border-color: #16A34A; background: rgba(22,163,74,0.2); }
        .step-indicator.skipped { border-color: #94A3B8; background: rgba(148,163,184,0.1); }
        .step-indicator.failed  { border-color: #DC2626; background: rgba(220,38,38,0.2); }
        .step-num { color: rgba(255,255,255,0.25); font-size: 11px; font-weight: 600; }
        .step-check { color: #4ADE80; font-size: 15px; animation: checkPop 0.4s ease; }
        .step-skip  { color: #94A3B8; font-size: 13px; }
        .spinner-ring { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
        .step-label { font-size: 14px; font-weight: 600; transition: color 0.3s; margin-top: 7px; }
        .step-label.pending { color: rgba(255,255,255,0.25); } .step-label.active { color: white; } .step-label.done { color: #86EFAC; } .step-label.skipped { color: #94A3B8; } .step-label.failed { color: #FCA5A5; }
        .step-detail { font-size: 10px; font-family: 'IBM Plex Mono', monospace; color: rgba(255,255,255,0.2); margin-top: 2px; }
        .status-bar { background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.06); padding: 14px 20px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; animation: blink 1.2s ease infinite; }
        .proof-preview { background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2); border-radius: 14px; padding: 18px 20px; margin-bottom: 16px; animation: fadeUp 0.4s ease; }
        .proof-preview-title { font-size: 13px; font-weight: 700; color: #86EFAC; margin-bottom: 8px; }
        .proof-hash { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: rgba(255,255,255,0.4); word-break: break-all; margin-bottom: 10px; }
        .proof-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .proof-tag { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; background: rgba(22,163,74,0.2); }
        .proof-tag.true  { color: #86EFAC; } .proof-tag.false { color: #FCA5A5; background: rgba(220,38,38,0.15); }
        .algo-link { display: block; font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: #60A5FA; word-break: break-all; text-decoration: none; background: rgba(37,99,235,0.1); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(37,99,235,0.2); margin-top: 6px; }
        .algo-link:hover { text-decoration: underline; }
        .error-box { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); border-radius: 14px; padding: 18px 20px; color: #FCA5A5; font-size: 13px; margin-bottom: 16px; display: flex; gap: 10px; align-items: flex-start; }
        .btn-back { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s; }
        .btn-back:hover { background: rgba(255,255,255,0.1); color: white; }
        .footer-text { text-align: center; margin-top: 20px; font-size: 10px; color: rgba(255,255,255,0.15); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes checkPop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
      `}</style>

      <div className="shell">
        <div className="card">
          <div className="header">
            <div className="header-icon">🔐</div>
            <div className="header-title">ZK-PASS + DigiLocker</div>
            <div className="header-sub">Completing verification flow…</div>
          </div>

          <div className="progress-wrap">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="progress-label">{progress}/{STEPS.length} steps</div>

          <div className="steps-panel">
            <div className="steps-body">
              {STEPS.map((step, idx) => {
                const status  = stepStatus[step.id];
                const active  = currentStep === idx && !status;
                const done    = status === "done";
                const skipped = status === "skipped";
                const failed  = status === "failed";
                const pending = !active && !done && !skipped && !failed;
                const cls = done ? "done" : failed ? "failed" : skipped ? "skipped" : active ? "active" : "pending";

                return (
                  <div className={`step ${cls}`} key={step.id}>
                    <div className={`step-indicator ${cls}`}>
                      {done    ? <span className="step-check">✓</span>
                       : failed  ? <span style={{color:"#F87171",fontSize:15}}>✗</span>
                       : skipped ? <span className="step-skip">–</span>
                       : active  ? <div className="spinner-ring" />
                       : <span className="step-num">{idx + 1}</span>}
                    </div>
                    <div>
                      <div className={`step-label ${cls}`}>{step.label}</div>
                      <div className="step-detail">{step.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="status-bar">
              {isError ? (
                <span style={{ color: "#FCA5A5" }}>❌ {error}</span>
              ) : isDone ? (
                <><div className="status-dot" style={{ background: "#4ADE80" }} /><span style={{ color: "#86EFAC" }}>All done! Redirecting…</span></>
              ) : currentStep >= 0 ? (
                <><div className="status-dot" style={{ background: "#60A5FA" }} /><span style={{ color: "rgba(255,255,255,0.5)" }}>{STEPS[currentStep]?.label}…</span></>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.3)" }}>Initializing…</span>
              )}
            </div>
          </div>

          {isDone && proofData && (
            <div className="proof-preview">
              <div className="proof-preview-title">🧮 Groth16 ZK Proof Generated</div>
              <div className="proof-hash">{JSON.stringify(proofData.proof)?.slice(0, 60)}…</div>
              <div className="proof-tags">
                <span className={`proof-tag ${proofData.publicClaims?.isAdult ? "true" : "false"}`}>
                  isAdult: {String(proofData.publicClaims?.isAdult)}
                </span>
                <span className={`proof-tag ${proofData.publicClaims?.isIndian ? "true" : "false"}`}>
                  isIndian: {String(proofData.publicClaims?.isIndian)}
                </span>
              </div>
              {proofData.txId && (
                <a className="algo-link" href={`https://lora.algokit.io/testnet/transaction/${proofData.txId}`} target="_blank" rel="noreferrer">
                  ⛓️ Algorand TX: {proofData.txId}
                </a>
              )}
            </div>
          )}

          {isError && (
            <>
              <div className="error-box"><span>❌</span><span>{error}</span></div>
              <button className="btn-back" onClick={() => window.location.href = "/"}>← Back to App</button>
            </>
          )}

          <div className="footer-text">ZK-PASS · Groth16 · Algorand Testnet · Mock DigiLocker</div>
        </div>
      </div>
    </>
  );
}
