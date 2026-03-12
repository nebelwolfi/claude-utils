---
created: 2026-03-03T20:06:46.635Z
updated: 2026-03-05T00:09:09.298Z
started: 2026-03-03T23:05:38.555Z
completed: 2026-03-05T00:08:31.948Z
priority: high
tags:
  - mba
  - linear-mba
  - core
  - hardening
---

# MBA: Linear MBA expressions (truth-table basis)

Implement the gold-standard MBA technique from academic research (Eyrolles, Zhou et al.): express bitwise functions as linear combinations over the truth-table basis with random coefficients.

## Theory

The 4 basis functions `e₁=x&y, e₂=x&~y, e₃=~x&y, e₄=~x&~y` partition all 64 bit positions. Any bitwise function `f(x,y)` has a unique decomposition `f = a₁·e₁ + a₂·e₂ + a₃·e₃ + a₄·e₄`.

**Key identity for noise injection:**
Since `e₁ + e₂ + e₃ + e₄ = 0xFFFFFFFFFFFFFFFF = -1 (mod 2^64)`, we have:
`k·(e₁ + e₂ + e₃ + e₄) + k = 0 (mod 2^64)` for any `k`.

So: `f(x,y) = (a₁+k)·e₁ + (a₂+k)·e₂ + (a₃+k)·e₃ + (a₄+k)·e₄ + k`

The coefficients become large random 64-bit values that are nearly impossible to simplify without understanding the algebra.

## Truth tables for each bitwise function

| Function | a₁ (x&y) | a₂ (x&~y) | a₃ (~x&y) | a₄ (~x&~y) |
|----------|-----------|-----------|-----------|------------|
| XOR      | 0         | 1         | 1         | 0          |
| AND      | 1         | 0         | 0         | 0          |
| OR       | 1         | 1         | 1         | 0          |

With random k, the obfuscated coefficients become:
- XOR: `[k, 1+k, 1+k, k]` + constant `k`
- AND: `[1+k, k, k, k]` + constant `k`
- OR:  `[1+k, 1+k, 1+k, k]` + constant `k`

## For ADD/SUB

Decompose first: `x + y = (x ^ y) + 2*(x & y)`.
Apply linear MBA to the XOR and AND sub-expressions independently with different random k values. Then combine with integer addition and shift.

## Implementation

New function `expandLinearMba(v, op, dst, src, s0, s1, s2, rng)` using **3 scratch registers**:
- `s0` = saved original x
- `s1` = saved original y
- `s2` = temp for basis computation
- `dst` = accumulator

Per-term pattern (4 terms + constant):
```
// Term i: coeff_i * basis_i
s2 = <compute basis_i from s0, s1>
PUSH dst
MOV_RI dst, coeff_i    // large random 64-bit coefficient
MUL s2, dst            // s2 = coeff_i * basis_i
POP dst
ADD dst, s2            // accumulate
```

Total: ~40 instructions for bitwise ops, ~85 for ADD/SUB (two linear MBAs + combine).

## Variant integration

Add as variant V4 (or higher) for each operation. Selected by the RNG with configurable weight. Since it produces much larger code, only select it when depth=1 (at depth>2 the size explosion would be extreme).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement truth-table basis computation (4 basis values)
- [x] Implement coefficient generation with random k
- [x] Implement expandLinearXor (truth-table basis XOR)
- [x] Implement expandLinearAnd (truth-table basis AND)
- [x] Implement expandLinearOr (truth-table basis OR)
- [x] Implement expandLinearAdd (decompose into XOR+AND then linear MBA each)
- [x] Implement expandLinearSub (decompose into XOR+NOT+AND then linear MBA each)
- [x] Update pickScratchRegs to support 3-register selection
- [x] Wire linear MBA variants into variant selection dispatch

## Relations

- [requires mba-variant-selection-dispatch-generate-mba-sequence-rewrite](mba-variant-selection-dispatch-generate-mba-sequence-rewrite.md)
