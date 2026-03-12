---
created: 2026-03-11T15:47:39.482Z
updated: 2026-03-11T15:47:39.482Z
tags:
  - mba
  - constant-hiding
  - hardening
  - anti-pattern
---

# MBA: Constant Synthesis (MOV_RI Obfuscation)

Replace `VM_MOV_RI dst, constant` instructions with MBA expressions that compute the constant from random components, hiding immediate values like AES keys, hash seeds, magic numbers, and opcode-map constants.

**Background**: Currently `MOV_RI` (10-byte: opcode + reg + imm64) loads constants in plaintext. These are high-value targets for reverse engineers - finding `0x6A09E667` immediately reveals SHA-256. Constant synthesis computes the value through MBA-style operations.

**Synthesis strategies** (randomly selected per constant):

1. **XOR decomposition**: `C = A ^ B` → `MOV s0, A; MOV s1, B; XOR s0, s1; MOV dst, s0`
   Then MBA-expand the XOR for full obfuscation.

2. **ADD decomposition**: `C = A + B` → `MOV s0, A; MOV s1, B; ADD s0, s1; MOV dst, s0`
   Then MBA-expand the ADD.

3. **AND-OR decomposition**: `C = (A & M) | (B & ~M)` for random mask M, where A/B are chosen to satisfy the equation. Then MBA-expand the AND/OR operations.

4. **Truth-table synthesis**: Express C as `sum(a[i] * basis_i(R1, R2)) + k` where R1, R2 are random constants loaded into scratch regs. This directly uses the existing linear MBA machinery - the "operation" is just the constant function `f(x,y) = C` with truth-table coefficients derived from C.

5. **Multi-step chain**: `C = ((A ^ B) + D) & E` - 3 operations, each MBA-expandable.

**Targeting**: Not all MOV_RI should be synthesized - only those with "interesting" constants (non-zero, non-one, non-small). Gate with a density parameter and/or minimum constant magnitude.

**Integration point**: Add `VM_MOV_RI` to `isMbaTarget()` or handle as a separate synthesis step in `applyOnce()`. Since MOV_RI has different instruction format (10 bytes, reg+imm64 not reg+reg), it needs its own path in the replacement logic.

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Design constant decomposition: implement at least 3 strategies (XOR split, ADD split, truth-table synthesis)
- [ ] Add `expandConstantSynthesis(v, dst, constant, rng)` that randomly picks a strategy and emits MBA-obfuscated constant computation
- [ ] Integrate into `applyOnce()`: detect MOV_RI instructions, extract the 64-bit immediate, call synthesis
- [ ] Gate with density: add `constant_synthesis_density` to MbaConfig (default 0.0, so off by default)
- [ ] Skip trivial constants: don't synthesize 0, 1, -1, or small values (configurable threshold)
- [ ] Compose with existing MBA: after decomposition, MBA-expand the inner arithmetic ops (XOR/ADD/AND/OR)
- [ ] Add config plumbing: MbaConfig, PeckerConfig, args.h (--mba-const-synth), pipeline.h, cmd_protect.h
- [ ] Tests: verify synthesized constants produce correct values for known inputs (0xDEADBEEF, SHA-256 IV, etc.)
- [ ] Tests: verify programs with many MOV_RI instructions still produce correct results after synthesis

