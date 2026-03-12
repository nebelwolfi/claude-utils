---
created: 2026-03-11T15:13:12.762Z
updated: 2026-03-12T10:55:40.184Z
started: 2026-03-12T10:44:29.372Z
priority: high
tags:
  - mba
  - griffin-style
  - core
  - hardening
---

# MBA: 3-Variable Basis Infrastructure

Add 8-term truth-table basis over 3 variables to the MBA pass, inspired by Griffin/Themida's MBA style which produces significantly harder-to-simplify expressions in IDA.

**Background**: Griffin uses 3 input variables (8 basis terms) vs PEcker's current 2 variables (4 basis terms). The 8-term expressions are exponentially harder for automated MBA simplification tools (SSPAM, MBA-Blast, SiMBA) to reduce.

**Basis functions** (partition all 64-bit positions):
```
b0 = x & y & z       b4 = ~x & y & z
b1 = x & y & ~z      b5 = ~x & y & ~z
b2 = x & ~y & z      b6 = ~x & ~y & z
b3 = x & ~y & ~z     b7 = ~x & ~y & ~z
```

Identity: `sum(all 8) = -1 (mod 2^64)` - same partition trick as 2-var, so the uniform noise `k` approach extends naturally.

**Key insight**: Since `x OP y` doesn't depend on `z`, the truth-table coefficients repeat in pairs (z=1/z=0 split). E.g. XOR → `[0,0,1,1,1,1,0,0]`. The 3rd variable `z` is loaded with a random constant (or runtime opaque value - see separate task). The result is always correct regardless of z's value, but static analyzers cannot prove z is irrelevant without solving the full 8-term expression.

**File**: `include/PEcker/obfuscation/mba.h`, add after existing `TruthTableCoeffs` (~line 175).

**Scratch register budget**: 4 registers (s0=preserved x, s1=preserved y, s2=z, s3=temp). `pickScratchRegs` picks from 14 candidates (R0-R15 minus dst/src), so 4 is well within bounds.

## Sub-tasks
- [ ] Add `TruthTableCoeffs3` struct with `u64 a[8]` for 8 basis functions
- [ ] Add `truthTableCoeffs3(Opcode)` - derive 8 coefficients from 2-var by z=1/z=0 pairing: XOR→[0,0,1,1,1,1,0,0], AND→[1,1,0,0,0,0,0,0], OR→[1,1,1,1,1,1,0,0]
- [ ] Add `NoisedTruthTableCoeffs3` struct and `noiseTruthTableCoeffs3()` - extend single-k noise to 8 terms with Eyrolles zero-sum perturbation for per-term visual variance
- [ ] Add `emitBasisTerm3(v, idx, result, x, y, z)` - emit one of 8 three-variable basis terms (3-5 VM instructions each, use De Morgan for multi-NOT terms: b3=x&~(y|z), b7=~(x|y|z))
- [ ] Add 4-register `pickScratchRegs` convenience overload

