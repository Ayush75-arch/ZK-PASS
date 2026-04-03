pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template AgeCheck() {
	signal input age;
	signal output isAdult;

	component gt = GreaterThan(8);

	gt.in[0] <== age;
	gt.in[1] <== 18;
	
	isAdult <== gt.out;
}
component main = AgeCheck();
