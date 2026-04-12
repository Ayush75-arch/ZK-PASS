pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template IdentityCheck() {
    signal input age;
    signal input isIndian;   // must be exactly 1 (Indian) or 0 (Foreign)

    signal output isValid;

    // ── Enforce isIndian is boolean (0 or 1) ─────────────────────────────
    // isIndian * (1 - isIndian) == 0 holds only for 0 or 1
    isIndian * (1 - isIndian) === 0;

    // ── Check age >= 18 (GreaterEqThan, not GreaterThan) ─────────────────
    component gte = GreaterEqThan(8);
    gte.in[0] <== age;
    gte.in[1] <== 18;

    signal isAdult;
    isAdult <== gte.out;

    // ── Final condition: adult AND Indian ─────────────────────────────────
    isValid <== isAdult * isIndian;
}

component main = IdentityCheck();
