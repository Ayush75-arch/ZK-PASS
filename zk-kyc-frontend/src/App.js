import React, { useState } from "react";

function App() {
  const [txId, setTxId] = useState("");
  const [loading, setLoading] = useState(false);

  const sendTransaction = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/verify", {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setTxId(data.txId);
      } else {
        alert("Transaction failed");
      }

      setLoading(false);

    } catch (err) {
      console.error(err);
      alert("Backend connection error");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h2>🔐 ZK-KYC Verification (Algorand)</h2>

      <button onClick={sendTransaction} disabled={loading}>
        {loading ? "Processing..." : "Verify Age (18+)"}
      </button>

      {txId && (
        <div style={{ marginTop: 20 }}>
          <p>✅ Transaction Sent</p>
          <p><b>Tx ID:</b> {txId}</p>
        </div>
      )}
    </div>
  );
}

export default App;