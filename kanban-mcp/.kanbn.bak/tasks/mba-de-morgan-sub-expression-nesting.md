---
created: 2026-03-11T15:13:57.001Z
updated: 2026-03-11T15:14:39.747Z
tags:
  - mba
  - griffin-style
  - hardening
  - anti-simplification
---

# MBA: De Morgan Sub-Expression Nesting

Obfuscate basis term emissions with random De Morgan nesting, matching Griffin's deeply nested sub-expressions like `~(~(v51 & v50 & ~a11) & ~(a11 & ~(v51 & v50)))`.

**Depends on**: MBA: 3-Variable Basis Infrastructure

**Background**: Griffin's IDA output shows basis terms expressed through 2-3 levels of De Morgan equivalences. This defeats pattern-matching simplifiers that look for direct forms like `x & ~y`.

**Implementation**: Add `emitNestedBasisTerm3()` wrapper around `emitBasisTerm3()` that randomly selects between:
1. **Direct form**: call `emitBasisTerm3()` as-is (baseline)
2. **De Morgan AND→OR**: rewrite `a & b` as `~(~a | ~b)` (+2-4 instructions)
3. **De Morgan OR→AND**: rewrite `a | b` as `~(~a & ~b)` (+2-4 instructions)
4. **Double NOT**: wrap result in `~~result` (+2 instructions, pure noise for pattern breaker)

Each of the 8 basis terms independently picks a nesting strategy per invocation, so two expansions of the same operation look structurally different.

**Register pressure**: Uses only the `result` register + PUSH/POP to virtual stack for temps. No additional scratch register allocation needed.

**Gated by**: `config.nested_basis` flag. When false, `emitNestedBasisTerm3` is a passthrough to `emitBasisTerm3`.

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Add `emitNestedBasisTerm3()` with 4 nesting strategies (direct, DeMorgan AND→OR, DeMorgan OR→AND, double NOT)
- [ ] Each basis term independently picks a random nesting strategy - ensure all 8 terms can use all applicable strategies
- [ ] Replace `emitBasisTerm3()` calls in `expandLinear3Var*` functions with `emitNestedBasisTerm3()` when `nested_basis` is true
- [ ] Verify register preservation: x, y, z must be intact after nested emission


## Relations
- [blocked by mba-3-variable-basis-infrastructure](mba-3-variable-basis-infrastructure.md)

