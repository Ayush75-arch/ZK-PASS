import React, { useState, useEffect } from "react";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const peraWallet = new PeraWalletConnect({ chainId: 416002 });
const BACKEND = "http://localhost:5000";

const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

function App() {
  const [account, setAccount] = useState(null);
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [shareAge, setShareAge] = useState(true);
  const [shareNationality, setShareNationality] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [txId, setTxId] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length) setAccount(accounts[0]);
    });
    peraWallet.connector?.on("disconnect", () => setAccount(null));
  }, []);

  const connectWallet = async () => {
    try {
      if (account) return;
      const accounts = await peraWallet.connect();
      setAccount(accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccount(null);
    setExtractResult(null);
    setVerifyResult(null);
    setTxId(null);
    setError("");
  };

  // Step 1: Generate ZK Proof
  const handleExtract = async () => {
    setError("");
    setExtractResult(null);
    setVerifyResult(null);
    setTxId(null);

    if (!dob) return setError("Please enter your date of birth.");
    if (shareNationality && !nationality) return setError("Please enter your nationality.");

    setLoading("Generating proof...");
    try {
      const res = await fetch(`${BACKEND}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob,
          nationality: shareNationality ? nationality : "india",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extract failed");
      setExtractResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  };

  // Step 2: Verify and store on Algorand
  const handleVerifyAndStore = async () => {
    if (!extractResult) return setError("Generate ZK Proof first.");
    if (!account) return setError("Please connect your Pera Wallet first.");

    setError("");
    setLoading("Storing on Algorand...");

    try {
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

      // Show TX ID from backend
      if (data.txId) setTxId(data.txId);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2>ZK Identity Verification</h2>
      <p>Prove your identity without revealing your data</p>

      <hr />

      {/* Wallet */}
      <div style={{ marginBottom: 20 }}>
        {!account ? (
          <button onClick={connectWallet}>Connect Pera Wallet</button>
        ) : (
          <div>
            <span style={{ color: "green" }}>● Connected: </span>
            <code>{account.slice(0, 8)}...{account.slice(-6)}</code>
            <button onClick={disconnectWallet} style={{ marginLeft: 10 }}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      <hr />

      {/* Form */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Date of Birth</label><br />
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={{ padding: 8, width: "100%", marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Nationality</label><br />
          <input
            type="text"
            placeholder="e.g. India"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            style={{ padding: 8, width: "100%", marginTop: 4 }}
          />
        </div>
      </div>

      {/* Selective Disclosure */}
      <div style={{ marginBottom: 20 }}>
        <b>Selective Disclosure</b>
        <p style={{ color: "#666", fontSize: 13 }}>Choose what you consent to share:</p>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={shareAge}
            onChange={(e) => setShareAge(e.target.checked)}
          />
          {" "}Share Age ≥ 18 proof (required)
        </label>

        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={shareNationality}
            onChange={(e) => setShareNationality(e.target.checked)}
          />
          {" "}Share Nationality proof
        </label>
      </div>

      {/* Buttons */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={handleExtract}
          disabled={!!loading}
          style={{ padding: "10px 20px", marginRight: 10, cursor: "pointer" }}
        >
          {loading === "Generating proof..." ? "Generating..." : "Generate ZK Proof"}
        </button>

        {extractResult && (
          <button
            onClick={handleVerifyAndStore}
            disabled={!!loading}
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            {loading === "Storing on Algorand..." ? "Storing..." : "Verify & Store on Algorand"}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: "red", marginBottom: 16 }}>
          Error: {error}
        </div>
      )}

      {/* ZK Proof Result */}
      {extractResult && (
        <div style={{ border: "1px solid #ccc", padding: 16, marginBottom: 16, borderRadius: 8 }}>
          <b>ZK Proof Generated</b>
          <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
            <tbody>
              {shareAge && (
                <>
                  <tr>
                    <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>Age ≥ 18</td>
                    <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{extractResult.ageAbove18 ? "✅ TRUE" : "❌ FALSE"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>Age ≥ 21</td>
                    <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{extractResult.ageAbove21 ? "✅ TRUE" : "❌ FALSE"}</td>
                  </tr>
                </>
              )}
              {shareNationality && (
                <tr>
                  <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>Is Indian</td>
                  <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{extractResult.isIndian ? "✅ TRUE" : "❌ FALSE"}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: 6 }}>SHA-256 Hash</td>
                <td style={{ padding: 6, fontFamily: "monospace", fontSize: 12 }}>{extractResult.hash.slice(0, 20)}...</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Your actual DOB and nationality are NOT stored or transmitted — only the proof result.
          </p>
        </div>
      )}

      {/* On-chain Result */}
      {verifyResult && (
        <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
          <b>Stored on Algorand</b>
          <p>Verified: {verifyResult.verified ? "✅ YES" : "❌ NO"}</p>
          {txId && (
            <p>
              TX ID:{" "}
              <a
                href={`https://testnet.algoexplorer.io/tx/${txId}`}
                target="_blank"
                rel="noreferrer"
              >
                {txId}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;