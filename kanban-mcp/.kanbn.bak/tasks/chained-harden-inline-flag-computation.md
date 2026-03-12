---
created: 2026-02-26T20:58:44.234Z
updated: 2026-03-03T13:09:30.800Z
started: 2026-02-27T20:56:33.253Z
completed: 2026-03-03T13:09:30.800Z
---

# Chained harden: inline flag computation

Instead of all arithmetic/logic handlers calling shared flag routines via CALL rel32 (currently set_arith_flags at line 416, set_logic_flags at line 536 of chained_handlers.h), inline the flag computation directly into each handler with randomly selected equivalent implementations. New emitInlineArithFlags(c, rng) and emitInlineLogicFlags(c, rng) with 2-3 variants each (branch-based, SETcc-based, shift-based). Eliminates the strongest handler classification signal - analyst can no longer find one CALL target and batch-classify all callers. ~250 lines. Blob increases ~1-2KB. Shared routines kept as fallback when disabled. Gated by --inline-flags (default true). Modifies all flag-emitting handler generators: ADD, SUB, CMP, XOR, AND, OR, SHL, SHR, SAR, TEST, INC, DEC, ADC, SBB (~14 handlers).

## Sub-tasks

- [x] Implement emitInlineLogicFlags(c, rng) with 3 variants (branch, SETcc, shift)
- [x] Implement emitInlineArithFlags(c, rng) with 2-3 variants
- [x] Implement emitInlineIncDecFlags(c, rng) with 2 variants
- [x] Implement emitInlineAdcFlags(c, rng) and emitInlineSbbFlags(c, rng)
- [x] Modify all 14 flag-emitting handler generators to use inline emitters when enabled
- [x] Skip appending shared routines to blob when all handlers inline
- [x] Add inline_flags field to PeckerConfig and --inline-flags to args parser
- [x] Add tests: verify flag computation correctness matches shared routine, verify no CALL rel32 present when inlining
