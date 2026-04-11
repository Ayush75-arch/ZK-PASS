#!/bin/bash

INPUT_FILE=$1

# Generate witness using new identity circuit
node identity_js/generate_witness.js identity_js/identity.wasm $INPUT_FILE witness.wtns

# Generate proof
./node_modules/.bin/snarkjs groth16 prove identity_final.zkey witness.wtns proof.json public.json

echo "Proof generated"
