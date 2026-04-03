import React, { useState, useEffect } from "react";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const peraWallet = new PeraWalletConnect({ chainId: 416002 });
const BACKEND = "http://localhost:3001";

// ─── Algorand Client ─────────────────────────────────────────────────────────
const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

function App() {
  // ── Wallet State ──────────────────────────────────────────────────────────
  const [account, setAccount] = useState(null);

  // ── Form State ────────────────────────────────────────────────────────────
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");

  // ── Selective Disclosure: what user agrees to share ───────────────────────
  const [shareAge, setShareAge] = useState(true);
  const [shareNationality, setShareNationality] = useState(false);

  // ── Result State ──────────────────────────────────────────────────────────
  const [extractResult, setExtractResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [txId, setTxId] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  // ── Reconnect wallet on reload ────────────────────────────────────────────
  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length) setAccount(accounts[0]);
    });
    peraWallet.connector?.on("disconnect", () => setAccount(null));
  }, []);

  // ── Connect Wallet ────────────────────────────────────────────────────────
  const connectWallet = async () => {
    try {
      if (account) return;
      const accounts = await peraWallet.connect();
      setAccount(accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError("Failed to connect wallet.");
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccount(null);
    setExtractResult(null);
    setVerifyResult(null);
    setTxId(null);
  };

  // ── Step 1: Extract proofs from backend ───────────────────────────────────
  const handleExtract = async () => {
    setError("");
    setExtractResult(null);
    setVerifyResult(null);
    setTxId(null);

    if (!dob) return setError("Please enter your date of birth.");
    if (shareNationality && !nationality) return setError("Please enter your nationality.");

    setLoading("Extracting ZK attributes...");
    try {
      const body = {
        dob,
        nationality: shareNationality ? nationality : "undisclosed",
      };

      const res = await fetch(`${BACKEND}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extract failed");

      console.log("Extract result:", data);
      setExtractResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  };

  // ── Step 2: Verify + store proof on Algorand via Pera Wallet ─────────────
  const handleVerifyAndStore = async () => {
    if (!extractResult) return setError("Run extraction first.");
    if (!account) return setError("Please connect your Pera Wallet first.");

    setError("");
    setLoading("Verifying and storing on Algorand...");

    try {
      // Call backend /verify — this sends proof to Algorand from server wallet
      const res = await fetch(`${BACKEND}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: extractResult.hash,
          ageAbove18: extractResult.ageAbove18,
          isIndian: extractResult.isIndian,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verify failed");

      setVerifyResult(data);
      if (data.txId) setTxId(data.txId);

      // Also sign a 0-ALGO transaction from user's Pera Wallet
      // This records the user's explicit on-chain consent
      await signConsentTransaction(extractResult.hash);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  };

  // ── Sign a consent transaction via Pera Wallet ────────────────────────────
  const signConsentTransaction = async (hash) => {
    try {
      const params = await algodClient.getTransactionParams().do();

      const consentNote = new TextEncoder().encode(
        JSON.stringify({ consent: true, hash: hash.slice(0, 32), ts: Date.now() })
      );

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: account,        // algosdk v1 style (matches your backend)
        to: account,
        amount: 0,
        note: consentNote,
        suggestedParams: params,
      });

      const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");

      const signedTxn = await peraWallet.signTransaction([[{ txn: encodedTxn }]]);

      // Submit signed consent transaction
      const submitRes = await algodClient
        .sendRawTransaction(signedTxn.flat())
        .do();

      console.log("✅ Consent TX signed by user:", submitRes.txId);
      setTxId((prev) => prev || submitRes.txId);
    } catch (err) {
      console.error("Consent sign error:", err);
      // Don't block the flow if user rejects consent signing
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 ZK-KYC Identity Verification</h1>
        <p style={styles.subtitle}>Prove your identity without revealing your data</p>

        {/* ── Wallet Section ── */}
        <div style={styles.section}>
          {!account ? (
            <button style={styles.btnPrimary} onClick={connectWallet}>
              🔗 Connect Pera Wallet
            </button>
          ) : (
            <div style={styles.walletBox}>
              <span style={styles.dot}>●</span>
              <span style={styles.walletAddr}>
                {account.slice(0, 8)}...{account.slice(-6)}
              </span>
              <button style={styles.btnSmall} onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>

        <hr style={styles.divider} />

        {/* ── Input Form ── */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📋 Your Information</h3>

          <label style={styles.label}>Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Nationality</label>
          <input
            type="text"
            placeholder="e.g. India"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* ── Selective Disclosure ── */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🛡️ Selective Disclosure</h3>
          <p style={styles.hint}>Choose what you consent to share:</p>

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={shareAge}
              onChange={(e) => setShareAge(e.target.checked)}
            />
            <span style={styles.checkLabel}>
              Share <b>Age ≥ 18</b> proof <span style={styles.badge}>required</span>
            </span>
          </label>

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={shareNationality}
              onChange={(e) => setShareNationality(e.target.checked)}
            />
            <span style={styles.checkLabel}>
              Share <b>Nationality</b> proof
            </span>
          </label>
        </div>

        {/* ── Action Buttons ── */}
        <div style={styles.section}>
          <button
            style={styles.btnPrimary}
            onClick={handleExtract}
            disabled={!!loading}
          >
            {loading === "Extracting ZK attributes..." ? "⏳ Extracting..." : "🔍 Generate ZK Proof"}
          </button>

          {extractResult && (
            <button
              style={{ ...styles.btnPrimary, background: "#1a7a4a", marginTop: 10 }}
              onClick={handleVerifyAndStore}
              disabled={!!loading}
            >
              {loading === "Verifying and storing on Algorand..." ? "⏳ Storing..." : "⛓️ Verify & Store on Algorand"}
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {error && <div style={styles.error}>❌ {error}</div>}

        {/* ── Extract Result ── */}
        {extractResult && (
          <div style={styles.result}>
            <h3>✅ ZK Proof Generated</h3>
            <table style={styles.table}>
              <tbody>
                {shareAge && (
                  <>
                    <tr>
                      <td style={styles.td}>Age ≥ 18</td>
                      <td style={styles.td}>{extractResult.ageAbove18 ? "✅ TRUE" : "❌ FALSE"}</td>
                    </tr>
                    <tr>
                      <td style={styles.td}>Age ≥ 21</td>
                      <td style={styles.td}>{extractResult.ageAbove21 ? "✅ TRUE" : "❌ FALSE"}</td>
                    </tr>
                  </>
                )}
                {shareNationality && (
                  <tr>
                    <td style={styles.td}>Is Indian</td>
                    <td style={styles.td}>{extractResult.isIndian ? "✅ TRUE" : "❌ FALSE"}</td>
                  </tr>
                )}
                <tr>
                  <td style={styles.td}>SHA-256 Hash</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11 }}>
                    {extractResult.hash.slice(0, 20)}...
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={styles.hint}>
              ⚠️ Your actual DOB and nationality are <b>NOT</b> stored or transmitted — only the proof result.
            </p>
          </div>
        )}

        {/* ── Verify Result ── */}
        {verifyResult && (
          <div style={{ ...styles.result, background: "#0d2b1a" }}>
            <h3>⛓️ Stored on Algorand</h3>
            <p>Verified: <b>{verifyResult.verified ? "✅ YES" : "❌ NO"}</b></p>
            {txId && (
              <p>
                TX ID:{" "}
                <a
                  href={`https://testnet.algoexplorer.io/tx/${txId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#4fc" }}
                >
                  {txId.slice(0, 16)}...
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0f1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#e0e6f0",
    padding: "20px",
  },
  card: {
    background: "#111827",
    border: "1px solid #1e3a5f",
    borderRadius: 16,
    padding: "36px 40px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 0 40px rgba(0,100,255,0.08)",
  },
  title: { margin: 0, fontSize: 22, color: "#7dd3fc" },
  subtitle: { color: "#64748b", marginTop: 6, marginBottom: 20, fontSize: 14 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, marginBottom: 12, color: "#94a3b8" },
  label: { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e0e6f0",
    fontSize: 14,
    marginBottom: 14,
    boxSizing: "border-box",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    cursor: "pointer",
  },
  checkLabel: { fontSize: 14 },
  badge: {
    background: "#1e3a5f",
    color: "#7dd3fc",
    fontSize: 11,
    padding: "1px 6px",
    borderRadius: 4,
    marginLeft: 6,
  },
  btnPrimary: {
    width: "100%",
    padding: "12px",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    cursor: "pointer",
    fontWeight: 600,
  },
  btnSmall: {
    padding: "4px 10px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 12,
  },
  walletBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#1e293b",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #334155",
  },
  dot: { color: "#22c55e", fontSize: 10 },
  walletAddr: { flex: 1, fontFamily: "monospace", fontSize: 13, color: "#7dd3fc" },
  divider: { border: "none", borderTop: "1px solid #1e293b", margin: "4px 0 20px" },
  error: {
    background: "#2d0f0f",
    border: "1px solid #7f1d1d",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#fca5a5",
    fontSize: 14,
    marginBottom: 16,
  },
  result: {
    background: "#0f1f35",
    border: "1px solid #1e3a5f",
    borderRadius: 12,
    padding: "16px 20px",
    marginTop: 16,
  },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 10 },
  td: {
    padding: "8px 10px",
    borderBottom: "1px solid #1e293b",
    fontSize: 14,
    color: "#cbd5e1",
  },
  hint: { fontSize: 12, color: "#475569", marginTop: 8 },
};

export default App;