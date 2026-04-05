const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");
const snarkjs = require("snarkjs");

const app = express();

app.use(express.json());
app.use(cors());

/* =========================
   Helper function (ASYNC)
========================= */
function runProof(inputFile) {
  return new Promise((resolve, reject) => {
    exec(`./generateProof.sh ${inputFile}`, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

/* =========================
   GENERATE PROOF
========================= */
app.post("/generate-proof", async (req, res) => {
  try {
    const { age } = req.body;

    if (!age) {
      return res.status(400).json({ error: "Age Required" });
    }

    // Unique file name (avoid overwrite issues)
    const id = Date.now();
    const inputFile = `input_${id}.json`;

    // Write input
    fs.writeFileSync(inputFile, JSON.stringify({ age }));

    // Run proof generation
    await runProof(inputFile);

    // Read output
    const proof = JSON.parse(fs.readFileSync("proof.json"));
    const publicSignals = JSON.parse(fs.readFileSync("public.json"));

    res.json({
      proof,
      publicSignals
    });

  } catch (err) {
    res.status(500).json({
      error: "ZK generation failed",
      details: err.message
    });
  }
});

/* =========================
   VERIFY PROOF
========================= */
app.post("/verify-proof", async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;

    const vKey = JSON.parse(fs.readFileSync("verification_key.json"));

    const verified = await snarkjs.groth16.verify(
      vKey,
      publicSignals,
      proof
    );

    res.json({ verified });

  } catch (err) {
    res.status(500).json({
      error: "Verification failed",
      details: err.message
    });
  }
});

/* =========================
   SERVER START
========================= */
app.listen(4000, () => {
  console.log("ZK Server running on port 4000");
});
