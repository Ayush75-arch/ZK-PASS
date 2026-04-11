pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template IdentityCheck() {
    signal input age;
    signal input isIndian;   // 1 = Indian, 0 = Foreign

    signal output isValid;

    // Check age >= 18
    component gt = GreaterThan(8);
    gt.in[0] <== age;
    gt.in[1] <== 18;

    signal isAdult;
    isAdult <== gt.out;

    // Ensure isIndian is boolean (0 or 1)
    signal isIndianValid;
    isIndianValid <== isIndian * (1 - isIndian);

    // Final condition: adult AND Indian
    isValid <== isAdult * isIndian;
}

component main = IdentityCheck();
