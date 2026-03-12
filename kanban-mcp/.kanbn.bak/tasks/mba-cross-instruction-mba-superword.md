---
created: 2026-03-11T16:00:15.323Z
updated: 2026-03-11T16:00:15.324Z
tags:
  - mba
  - superword
  - peephole
  - anti-simplification
---

# MBA: Cross-Instruction MBA (Superword)

Identify consecutive instruction pairs where the output of one feeds the input of the next (e.g., `t = x + y; r = t ^ z`) and replace the *combined* operation with a single MBA expression for `(x+y) ^ z`. The intermediate value `t` vanishes entirely - an attacker can no longer simplify each instruction independently.

**Current state**: `applyOnce()` in `mba.h` replaces each instruction independently. Each `VM_ADD`, `VM_XOR`, etc. gets its own MBA expansion. An attacker can simplify each expansion back to the original operation one at a time.

**Approach - peephole analysis before expansion**:

1. **Dependency scanner**: Before MBA expansion, scan instruction pairs `(I[k], I[k+1])` looking for data-flow dependencies:
   - `I[k]` writes to register `R`, `I[k+1]` reads `R` as an operand
   - Both are MBA-targetable opcodes (ADD/SUB/XOR/AND/OR)
   - `R` is not read again after `I[k+1]` (dead after fusion) - or if it is, we must preserve the intermediate value

2. **Combined truth-table generation**: For a fused pair like `(x+y) ^ z`:
   - Compute the combined truth table over 3 variables `(x, y, z)` → uses 3-variable MBA infrastructure
   - Generate MBA coefficients for the combined operation directly
   - The resulting expansion has no instruction boundary where the intermediate value is observable

3. **Implementation in `applyOnce()`**: Add a pre-pass before the main replacement loop:
   ```
   // Phase 1.5: Identify fusible instruction pairs
   for (size_t k = 0; k < instr_starts.size() - 1; ++k) {
       auto [op1, dst1, src1] = decode(instr_starts[k]);
       auto [op2, dst2, src2] = decode(instr_starts[k+1]);
       if (isMbaTarget(op1) && isMbaTarget(op2) && dst1 == src2) {
           // Mark as fused pair, skip individual expansion
           generateCombinedMbaSequence(seq, op1, op2, dst2, src1, dst1_as_src2, rng);
       }
   }
   ```

4. **New function `generateCombinedMbaSequence()`**: Takes two opcodes and three register operands, computes combined truth table, generates 3-variable MBA expansion.

**Scope limitations**:
- Start with 2-instruction fusion only (pairs). 3+ instruction chains are exponentially harder.
- Only fuse when intermediate register is dead after the pair (liveness analysis). Conservative: skip if unsure.
- Only fuse same-width operations (both 64-bit or both 32-bit equivalent).

**Relation to existing code**:
- Uses the 3-variable MBA infrastructure (truth tables, basis vectors, coefficient generation) from `mba.h`
- `pickScratchRegs` needs to exclude all 3 operand registers
- The fused expansion replaces 2 original instructions with one MBA sequence - the replacement mapping in Phase 3 needs to account for this (2 original positions map to one new range)

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Implement dependency scanner: identify consecutive instruction pairs where dst of I[k] == src of I[k+1] and both are MBA targets
- [ ] Implement liveness check: verify intermediate register (dst of I[k]) is dead after I[k+1] - conservative: skip fusion if register is read again later
- [ ] Implement `generateCombinedMbaSequence()`: compute combined truth table for op1(x,y) then op2(result,z), generate 3-variable MBA expansion
- [ ] Handle replacement mapping: fused pair maps 2 original instruction positions to 1 replacement range in Phase 3 rebuild
- [ ] Add config option: `bool enable_superword = false` in MbaConfig (opt-in, off by default)
- [ ] Tests: fuse ADD+XOR, SUB+AND, XOR+OR - verify combined result matches sequential execution
- [ ] Tests: verify non-fusible pairs (intermediate value used later) are left as independent expansions
- [ ] Tests: fib(10) and sum(1..10) with superword enabled - correctness check
- [ ] Tests: superword + depth 2 composition - fused instructions get MBA-expanded on second pass

