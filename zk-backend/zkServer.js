const express = require("express");
const fs = require("fs");
const { execSync } = require("child_process");

const app= express();
app.use(express.json());

app.post("/generate-proof", (req, res) => 
{
try{
const{ age }=req.body;

if(!age) {
return res.status(400).json({error: "Age Required"});
}

fs.writeFileSync("input.json",JSON.stringify(
{
age
}));
execSync("./generateProof.sh input.json");

const proof=JSON.parse(fs.readFileSync("proof.json"));

const publicSignals=JSON.parse(fs.readFileSync("public.json"));

res.json({
proof,
publicSignals
});

}
catch(err){
res.status(500).json({
error:"ZK generation failed",
details: err.message});
}
});
app.listen(4000, () => {console.log("ZK server running on port 4000");});
