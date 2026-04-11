import React, { useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:5000";

function StepBadge({ step, label, status }) {
  const colors = {
    idle: "#555",
    loading: "#f0a500",
    success: "#22c55e",
    error: "#ef4444",
  };
  const icons = { idle: "○", loading: "⟳", success: "✅", error: "❌" };
  return (
    <div className="step-badge" style={{ borderColor: colors[status] }}>
      <span className="step-num" style={{ color: colors[status] }}>
        {icons[status]} Step {step}
      </span>
      <span className="step-label">{label}</span>
    </div>
  );
}

function App() {
  const [age, setAge] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [steps, setSteps] = useState({
    input: "idle",
    zk: "idle",
    algo: "idle",
  });

  const handleVerify = async () => {
    if (!age || isNaN(Number(age))) {
      setError("Please enter a valid age.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSteps({ input: "success", zk: "loading", algo: "idle" });

    try {
      const res = await fetch(`${BACKEND_URL}/verify-identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: Number(age), nationality }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSteps({ input: "success", zk: "error", algo: "idle" });
        setError(data.error || data.message || "Verification failed.");
        setResult(data);
        setLoading(false);
        return;
      }

      setSteps({
        input: "success",
        zk: data.zkVerified ? "success" : "error",
        algo: data.txId ? "success" : data.zkVerified ? "idle" : "error",
      });

      setResult(data);
    } catch (err) {
      setError("Cannot reach backend. Is it running on port 5000?");
      setSteps({ input: "error", zk: "idle", algo: "idle" });
    }

    setLoading(false);
  };

  const reset = () => {
    setAge("");
    setNationality("Indian");
    setResult(null);
    setError("");
    setSteps({ input: "idle", zk: "idle", algo: "idle" });
  };

  return (
    <div className="app-wrapper">
      <div className="card">
        {/* Header */}
        <div className="card-header">
          <div className="logo">🔐</div>
          <h1>ZK-PASS</h1>
          <p className="subtitle">
            Zero-Knowledge Identity Verification · Anchored on Algorand
          </p>
        </div>

        {/* Input form */}
        <div className="card-body">
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              min={0}
              max={150}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Nationality</label>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              disabled={loading}
            >
              <option value="Indian">Indian</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <p className="circuit-note">
            Circuit checks: <strong>age ≥ 18</strong> AND{" "}
            <strong>Indian nationality</strong> — without revealing your actual
            age or identity.
          </p>

          <button
            className="btn-primary"
            onClick={handleVerify}
            disabled={loading || !age}
          >
            {loading ? "⟳  Generating proof…" : "Verify Identity"}
          </button>

          {result && (
            <button className="btn-secondary" onClick={reset}>
              Reset
            </button>
          )}
        </div>

        {/* Pipeline steps */}
        {steps.input !== "idle" && (
          <div className="steps">
            <StepBadge step={1} label="Input collected" status={steps.input} />
            <div className="step-arrow">→</div>
            <StepBadge step={2} label="ZK proof generated & verified" status={steps.zk} />
            <div className="step-arrow">→</div>
            <StepBadge step={3} label="Anchored on Algorand" status={steps.algo} />
          </div>
        )}

        {/* Error */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Success result */}
        {result && result.zkVerified && (
          <div className="result-box">
            <h3>✅ Identity Verified</h3>
            {result.txId ? (
              <>
                <p>
                  <strong>Algorand Tx ID:</strong>
                </p>
                <a
                  href={`https://testnet.algoexplorer.io/tx/${result.txId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tx-link"
                >
                  {result.txId}
                </a>
              </>
            ) : (
              <p className="muted">Algorand anchoring skipped (MNEMONIC not set)</p>
            )}

            <details className="proof-details">
              <summary>View ZK Proof</summary>
              <pre>{JSON.stringify(result.proof, null, 2)}</pre>
            </details>
            <details className="proof-details">
              <summary>Public Signals</summary>
              <pre>{JSON.stringify(result.publicSignals, null, 2)}</pre>
            </details>
          </div>
        )}

        {result && !result.zkVerified && (
          <div className="alert alert-error">
            ❌ ZK proof failed — this identity does not satisfy the circuit
            constraints (age ≥ 18 AND Indian nationality).
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
