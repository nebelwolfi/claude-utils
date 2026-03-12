---
created: 2026-02-26T20:21:45.516Z
updated: 2026-03-02T11:41:55.746Z
started: 2026-02-27T20:08:25.142Z
completed: 2026-02-28T21:23:54.232Z
---

# AntiTaint: unit test suite

tests/anti_taint_tests.cpp (~25 tests). Basic correctness per ALU op (6 tests). Edge cases: zero, all-ones, max u64 (4 tests). Fibonacci/sum loop integration (2 tests). Density control, seed variation. CryptoWash correctness. Bit-width control. Scratch register safety. Pipeline combos: antitaint+mba+junk, antitaint+flatten+mutate+encrypt. RFLAGS preservation.

## Relations

- [requires anti-taint-core-implicit-flow-pass](anti-taint-core-implicit-flow-pass.md)
