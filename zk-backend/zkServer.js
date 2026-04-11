const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const snarkjs = require("snarkjs");

const app = express();
app.use(express.json());

// Generate Proof
app.post("/generate-proof", (req, res) => {
    const { age, nationality } = req.body;

    // Convert nationality → binary
    const isIndian = nationality === "Indian" ? 1 : 0;

    const input = {
        age: age,
        isIndian: isIndian
    };

    const inputFile = `input_${Date.now()}.json`;
    fs.writeFileSync(inputFile, JSON.stringify(input));

    exec(`bash generateProof.sh ${inputFile}`, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Proof generation failed" });
        }

        const proof = JSON.parse(fs.readFileSync("proof.json"));
        const publicSignals = JSON.parse(fs.readFileSync("public.json"));

        res.json({ proof, publicSignals });
    });
});

// Verify Proof
app.post("/verify-proof", async (req, res) => {
    const { proof, publicSignals } = req.body;

    const vKey = JSON.parse(fs.readFileSync("verification_key.json"));

    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    if (verified) {
        res.json({ success: true, message: "Proof is valid ✅" });
    } else {
        res.json({ success: false, message: "Invalid proof ❌" });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
