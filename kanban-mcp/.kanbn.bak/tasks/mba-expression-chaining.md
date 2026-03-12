---
created: 2026-03-11T15:14:21.146Z
updated: 2026-03-11T15:14:41.359Z
tags:
  - mba
  - griffin-style
  - hardening
  - anti-simplification
---

# MBA: Expression Chaining

Chain multiple MBA expressions where intermediate results feed forward, matching Griffin's pattern where v798, v1160, v1159 feed into later expressions creating deep dependency graphs.

**Depends on**: MBA: 3-Variable Expansion Functions

**Background**: Griffin chains MBA outputs: `v798 = MBA(a11, a16, a36)` then uses v798 in subsequent expressions. Bottom-up simplification fails because simplifying stage 2 requires first solving stage 1.

**Implementation** - `expandChainedMba()`:
1. **Stage 1 (dummy)**: Compute `z = MBA_2var(x, y, dummy_op)` using the existing 4-term linear MBA. The dummy op is randomly chosen (e.g., AND when target is XOR).
2. **Stage 2 (real)**: Use z as the 3rd variable in a 3-var MBA that computes the actual target operation.

The data dependency makes it impossible to simplify stage 2 without first solving stage 1. Combined with per-term noise and De Morgan nesting, this is highly resistant to automated simplification.

**Estimated output**: ~40 instructions (stage 1) + ~80 instructions (stage 2) = ~140 instructions per chained expansion.

**This becomes variant V7** for ADD/SUB/XOR/AND (V6 for OR). Gated by `config.chain_mba`. When disabled, V7 is excluded from the variant pool.

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Add `expandChainedMba()` - stage 1: compute dummy bitwise op via existing 2-var linear MBA into z register
- [ ] Stage 2: use z as 3rd variable in 3-var MBA for the target operation
- [ ] Randomly select dummy_op for stage 1 (AND, OR, XOR - excluding the target op)
- [ ] Wire as variant V7 (V6 for OR) in generateMbaSequence dispatch
- [ ] Add `chain_mba` flag gating to variant count selection


## Relations
- [blocked by mba-3-variable-expansion-functions](mba-3-variable-expansion-functions.md)

