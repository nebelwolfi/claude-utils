---
created: 2026-03-11T15:13:29.586Z
updated: 2026-03-11T15:14:37.481Z
priority: high
tags:
  - mba
  - griffin-style
  - core
  - hardening
---

# MBA: 3-Variable Expansion Functions

Add 3-variable linear MBA expansion functions for all 5 operations, following the same pattern as existing 2-var `expandLinear*` functions but with 8-term accumulation loops.

**Depends on**: MBA: 3-Variable Basis Infrastructure

**Pattern** (same for XOR/AND/OR):
1. Save operands: s0=x, s1=y (s2=z already loaded by caller)
2. Init accumulator dst=0
3. Loop i=0..7: emit basis term b_i into s3, multiply by noised coefficient, accumulate into dst
4. Add constant correction term

**For ADD/SUB** (compound operations):
- ADD: `x+y = (x^y) + 2*(x&y)` - each sub-expression expanded with separate 3-var MBA
- SUB: `x-y = (x^y) - 2*(~x&y)` - same decomposition, ~x&y has basis coeffs `[0,0,0,0,1,1,0,0]`

**Estimated output**: ~80 instructions per bitwise op, ~170 for ADD/SUB. ~500-600 bytes per expansion (vs ~200-300 for 2-var). Acceptable given density control and VM dispatch overhead.

**File**: `include/PEcker/obfuscation/mba.h`, add after existing `expandLinearOr` (~line 530).

## Sub-tasks
- [ ] Add `expandLinear3VarXor(v, dst, src, s0, s1, s2, s3, rng)` - 8-term accumulation
- [ ] Add `expandLinear3VarAnd(v, dst, src, s0, s1, s2, s3, rng)`
- [ ] Add `expandLinear3VarOr(v, dst, src, s0, s1, s2, s3, rng)`
- [ ] Add `expandLinear3VarAdd(v, dst, src, s0, s1, s2, s3, rng)` - two composed 8-term expansions for (x^y) + 2*(x&y)
- [ ] Add `expandLinear3VarSub(v, dst, src, s0, s1, s2, s3, rng)` - two composed 8-term expansions for (x^y) - 2*(~x&y)
- [ ] Add `emitLoadZ(v, z_reg, rng)` - loads 3rd variable with random constant (runtime opaque sources added in separate task)


## Relations
- [blocked by mba-3-variable-basis-infrastructure](mba-3-variable-basis-infrastructure.md)

