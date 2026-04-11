import React, { useState, useEffect } from "react";
import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect({ chainId: 416002 });
const BACKEND = "http://localhost:5000";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [proofData, setProofData] = useState(null);

  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length) setWalletAddress(accounts[0]);
    }).catch(() => {});
    peraWallet.connector?.on("disconnect", () => setWalletAddress(""));
  }, []);

  const connectWallet = async () => {
    try {
      const accounts = await peraWallet.connect();
      setWalletAddress(accounts[0]);
    } catch (err) {
      setError("Wallet connection failed: " + err.message);
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setWalletAddress("");
  };

  const generateAndVerify = async () => {
    setError("");
    setTxId("");
    setProofData(null);
    setLoading(true);

    try {
      // Step 1: Generate ZK Proof
      setStatus("🔄 Generating ZK proof...");
      const genRes = await fetch(`${BACKEND}/generate-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob, nationality }),
      });
      const genData = await genRes.json();
      if (!genData.proof) throw new Error(genData.error || "Proof generation failed");
      setProofData(genData);
      console.log("✅ Proof generated");

      // Step 2: Verify ZK + Store on Algorand (backend signs)
      setStatus("⛓️ Storing on Algorand...");
      const verRes = await fetch(`${BACKEND}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: genData.hash,
          flags: genData.flags,
          proof: genData.proof,
          publicSignals: genData.publicSignals,
        }),
      });
      const verData = await verRes.json();
      if (!verData.verified) throw new Error("ZK proof verification failed");

      if (verData.txId) {
        setTxId(verData.txId);
        setStatus("✅ Done!");
      } else {
        setStatus("⚠️ Verified but no TX ID");
      }

    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: "0 auto", fontFamily: "Arial" }}>
      <h2>🔐 ZK-KYC Verification (Algorand)</h2>
      <p style={{ color: "#666" }}>Prove your identity without revealing your data</p>
      <hr />

      {/* Wallet */}
      <div style={{ marginBottom: 20 }}>
        {!walletAddress ? (
          <button onClick={connectWallet} style={{ padding: "10px 20px" }}>
            Connect Pera Wallet
          </button>
        ) : (
          <div>
            <span style={{ color: "green" }}>● Connected: </span>
            <code>{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</code>
            <button onClick={disconnectWallet} style={{ marginLeft: 10, padding: "4px 10px" }}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      <hr />

      {/* Form */}
      <div style={{ marginBottom: 16 }}>
        <label>Date of Birth</label><br />
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          style={{ padding: 8, width: "100%", marginTop: 4, marginBottom: 12 }}
        />
        <label>Nationality</label><br />
        <input
          type="text"
          placeholder="e.g. India"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          style={{ padding: 8, width: "100%", marginTop: 4 }}
        />
      </div>

      <button
        onClick={generateAndVerify}
        disabled={loading || !dob || !nationality}
        style={{ padding: "12px 24px", marginTop: 16, cursor: "pointer", width: "100%" }}
      >
        {loading ? status : "Generate Proof & Verify on Algorand"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: 16, padding: 12, border: "1px solid red", borderRadius: 6 }}>
          ❌ {error}
        </div>
      )}

      {proofData && (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <b>ZK Proof Generated</b>
          <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>Age ≥ 18</td>
                <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{proofData.flags?.ageAbove18 ? "✅ TRUE" : "❌ FALSE"}</td>
              </tr>
              <tr>
                <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>Age ≥ 21</td>
                <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{proofData.flags?.ageAbove21 ? "✅ TRUE" : "❌ FALSE"}</td>
              </tr>
              <tr>
                <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>Is Indian</td>
                <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{proofData.flags?.isIndian ? "✅ TRUE" : "❌ FALSE"}</td>
              </tr>
              <tr>
                <td style={{ padding: 6 }}>SHA-256 Hash</td>
                <td style={{ padding: 6, fontFamily: "monospace", fontSize: 12 }}>{proofData.hash?.slice(0, 20)}...</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            ⚠️ Your actual DOB is NOT stored — only the proof result.
          </p>
        </div>
      )}

      {txId && (
        <div style={{ marginTop: 16, padding: 16, border: "1px solid green", borderRadius: 8 }}>
          <b>✅ Stored on Algorand Blockchain</b>
          <p style={{ marginTop: 8 }}>
            TX ID:{" "}
            <a
              href={`https://lora.algokit.io/testnet/transaction/${txId}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: "monospace", fontSize: 13 }}
            >
              {txId}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

export default App;