---
created: 2026-03-07T08:38:30.591Z
updated: 2026-03-07T12:22:57.514Z
started: 2026-03-07T09:03:33.283Z
completed: 2026-03-07T12:22:20.858Z
---

# Opaque Predicate Branches in Entry Stubs

Insert conditional branches with always-true/false conditions into entry stubs to create fake control flow paths. Currently stubs are almost entirely linear (only the probe loop has branches), making them trivial to trace.

**8 Predicate Types**:
- AlgebraicEvenProduct: `n*(n+1) & 1 == 0` (always true)
- AlgebraicOrIdentity: `(x | ~x) == 0xFFFFFFFF` (always true)
- FlagBased_XorZF: `XOR EAX,EAX` sets ZF=1, `JNZ` never taken
- FlagBased_CLC/STC: `CLC; JC` never taken / `STC; JNC` never taken
- StackAlignment: `RSP & 0xF == 0` at aligned points
- MemoryPEB: `GS:[0x60]` (PEB) is never NULL
- RegisterInvariant: after known ops, check known results

**5 Injection Points** (all after prolog_size - .pdata safe):
1. After prolog_size, before zero-init
2. After zero-init, before arg copy (existing anti-decompile point 1)
3. After arg copy, before context setup
4. After context setup, before interpreter call
5. After return extraction, before epilogue

**False paths**: 12-32 bytes of plausible dead code (fake context stores, fake LEAs, fake arg copies). All wrapped in PUSHFQ/POPFQ + PUSH/POP scratch regs - zero net state change.

**Anti-symbolic-execution**: Algebraic predicates require multi-step bit-vector reasoning. Memory predicates require PEB modeling. Nested predicates create inter-dependent branches.

**Config**: density (float, per-injection-point probability), max_per_stub (cap), per-type enable/disable flags.

**Key files**: new opaque_branch.h, entry_stub.h (injection points), config.h, cmd_protect.h

## Sub-tasks

- [x] Create opaque_branch.h with PredicateKind enum and OpaquePredicateConfig struct
- [x] Implement emitAlgebraicEvenProduct() predicate generator
- [x] Implement emitAlgebraicOrIdentity() predicate generator
- [x] Implement emitFlagXorZF(), emitFlagCLC(), emitFlagSTC() flag-based predicates
- [x] Implement emitStackAlignment() predicate
- [x] Implement emitMemoryPEB() predicate (GS:[0x60] non-null check)
- [x] Implement emitRegisterInvariant() predicate
- [x] Implement generateFalsePath() with 5 plausible dead code templates
- [x] Implement emitRandomPredicate() dispatcher selecting from enabled types
- [x] Add 5 injection points in generateEntryStub() (all after prolog_size)
- [x] Add 5+ injection points in generateChainedEntryStub()
- [x] Add opaque_branches config fields to PeckerConfig (density, max, per-type enables)
- [x] Wire CLI flags and JSON config keys
- [x] Add to --shizo preset
- [x] Write test: opaque branches increase stub size
- [x] Write test: deterministic output for same seed
- [x] Write test: prolog_size unchanged
- [x] Write test: fixups remain valid
- [x] Write test: false paths contain no INT3 (0xCC)
- [x] Write test: combinable with anti-decompile gadgets
