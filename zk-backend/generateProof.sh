#!/bin/bash

INPUT_FILE=$1

node age_js/generate_witness.js age_js/age.wasm $INPUT_FILE witness.wtns

./node_modules/.bin/snarkjs groth16 prove age_final.zkey witness.wtns proof.json public.json

echo "Proof generated"
