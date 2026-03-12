---
created: 2026-03-11T16:00:26.623Z
updated: 2026-03-11T16:00:26.623Z
tags:
  - mba
  - depth
  - bugfix
  - effectiveness
---

# MBA: Fix Depth-2 Effectiveness

Fix the issue where `--mba-depth 2` often produces identical or nearly identical output to depth 1, making the depth configuration effectively useless.

**Current state**: `applyOnce()` is called `depth` times in a loop (mba.h:1768). On pass 2, it re-scans the expanded bytecode looking for MBA-targetable instructions. However, the expanded instructions from pass 1 use scratch registers allocated by `pickScratchRegs()` (mba.h:571), and the pattern of operations (PUSH/save scratch, MOV_RI, ALU ops on scratch, POP/restore) doesn't produce many new standalone `ADD dst, src` instructions that `isMbaTarget()` would match. The test at line ~336 explicitly documents this: "MBA expansions use R14/R15 as scratch, so the expanded instructions are not eligible for further transformation."

**Root cause analysis**:
The MBA expansion for e.g. `ADD dst, src` produces a sequence like:
```
PUSH s0          ← not targetable
PUSH s1          ← not targetable  
MOV_RI s0, coeff ← MOV_RI, targetable but it's an immediate load not ALU
XOR s1, dst      ← targetable! but s1 is a scratch reg
AND s0, s1       ← targetable! 
...
POP s1           ← not targetable
POP s0           ← not targetable
```

The inner ALU operations (XOR, AND, OR, ADD) on scratch registers *are* matched by `isMbaTarget()`, so they *should* be eligible for re-expansion on pass 2. The issue may be more subtle:

1. **RNG state coupling**: Pass 1 and pass 2 share the same `std::mt19937` instance, so pass 2's density rolls depend on pass 1's consumption. With `density < 1.0`, many eligible instructions are randomly skipped.
2. **Scratch register collision**: If pass 2 picks the same scratch registers that pass 1 used as operands, the expansion is trivially similar.
3. **Code growth**: Pass 1 already expands code significantly; pass 2 expands it again, potentially causing quadratic growth. The pass may bail out or hit limits.

**Proposed fixes**:

1. **Reseed RNG per pass**: Use `rng.seed(config_.seed + d)` at the start of each `applyOnce()` call, or use a separate RNG per pass. This ensures pass 2 makes independent density decisions.

2. **Force density=1.0 on subsequent passes**: On pass ≥ 1, expand *all* eligible instructions (no random skip). This guarantees that every ALU operation from pass 1's expansion gets re-expanded.

3. **Scratch register diversity**: On pass ≥ 1, bias `pickScratchRegs` to avoid registers used as scratch in the previous pass. One approach: pass the `pass` index to `pickScratchRegs` and rotate the candidate pool.

4. **Verify with metrics**: Add a debug counter for "instructions expanded in pass N" to confirm that pass 2 actually transforms instructions. Log ratio of `pass2_expanded / pass1_expanded`.

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Diagnose exact cause: add temporary counters to applyOnce() to log how many instructions are expanded per pass - identify whether the issue is density rolls, scratch collision, or target eligibility
- [ ] Fix RNG independence: reseed or create separate RNG for each depth pass so pass 2 decisions don't depend on pass 1 RNG state
- [ ] Consider forcing density=1.0 on pass >= 1 to ensure all eligible expanded instructions get re-expanded
- [ ] Implement scratch register rotation: on pass >= 1, bias pickScratchRegs away from registers used in previous pass expansions
- [ ] Update test expectations: depth 2 should now produce strictly more code than depth 1 for non-trivial programs
- [ ] Add test: verify depth-2 expansion count > depth-1 expansion count (not just code size, but actual instruction replacements)
- [ ] Test correctness: fib(10), sum(1..10), and AES round with depth=2 and depth=3 - verify results unchanged
- [ ] Performance check: measure code growth ratio for depth 1 vs 2 vs 3, ensure it's bounded (not accidentally quadratic)

