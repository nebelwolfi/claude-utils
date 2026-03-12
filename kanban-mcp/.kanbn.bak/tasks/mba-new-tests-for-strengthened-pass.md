---
created: 2026-03-03T19:56:02.365Z
updated: 2026-03-03T23:00:09.284Z
started: 2026-03-03T22:37:42.697Z
completed: 2026-03-03T22:59:49.376Z
priority: high
tags:
  - mba
  - tests
---

# MBA: New tests for strengthened pass

Add new tests to `tests/mba_tests.cpp` validating all strengthening and hardening changes.

## Core variant tests

- **Variant diversity test:** Run MBA on same program with 20+ seeds, assert at least 3 distinct output sizes (proving different variants selected).
- **All-registers-eligible:** Use R14/R15 as dst/src in ADD, verify expansion (previously skipped).
- **Multi-seed correctness sweep (dst != src):** 100 seeds, verify correct result each time.
- **Multi-seed correctness sweep (dst == src):** ADD R0,R0 → 14, SUB R0,R0 → 0, XOR R0,R0 → 0, AND R0,R0 → x, OR R0,R0 → x. 100 seeds.
- **Depth-2 fibonacci with variants.**

## Noise tests

- **Noise correctness:** All 5 ops with `noise_density=1.0`, verify correct results.
- **Noise size increase:** Verify bytecode larger with noise than without.
- **Fibonacci with noise.**
- **`--mba-noise` CLI flag parsing test.**

## Linear MBA tests

- **Linear MBA correctness for XOR/AND/OR:** Apply with seeds that select linear variant, verify results.
- **Linear MBA correctness for ADD/SUB:** Same, verify arithmetic results including overflow.
- **Linear MBA fibonacci:** Full program with linear MBA.
- **Coefficient randomness:** Verify output bytecode contains large 64-bit immediates (not 0 or 1).

## Expression splitting tests

- **Split correctness for XOR/AND/OR:** Verify bitwise results across many values.
- **Split correctness for ADD with carry:** Values like `0xFFFFFFFF + 1` where carry crosses the 32-bit boundary.
- **Split correctness for SUB with borrow:** Values like `0x100000000 - 1`.

## Opaque constant wrapping tests

- **Wrapping correctness for ADD/SUB/XOR:** Verify results with wrapping enabled.
- **Wrapping fibonacci:** Full program test.

## Expanded target tests

- **MOV_RR obfuscation:** Program with MOV_RR, verify MBA expands it and result is correct.
- **NOT obfuscation:** Program with NOT, verify expansion and correct result.
- **MOV_RR + NOT in pipeline:** Full program using both, with other passes.

**Files:** `tests/mba_tests.cpp`

## Sub-tasks

- [x] Add variant diversity test (multiple seeds, check distinct outputs)
- [x] Add all-registers-eligible test (R14/R15 as operands)
- [x] Add noise correctness tests (all 5 ops + fibonacci)
- [x] Add noise size increase test
- [x] Add multi-seed correctness sweep (dst != src, 100 seeds)
- [x] Add multi-seed correctness sweep (dst == src, 100 seeds)
- [x] Add --mba-noise CLI flag parsing test
- [x] Add depth-2 fibonacci with variants test

## Relations

- [requires mba-config-plumbing-for-mba-noise](mba-config-plumbing-for-mba-noise.md)
- [requires mba-linear-mba-expressions-truth-table-basis](mba-linear-mba-expressions-truth-table-basis.md)
- [requires mba-expression-splitting-32-bit-halves](mba-expression-splitting-32-bit-halves.md)
- [requires mba-opaque-constant-wrapping](mba-opaque-constant-wrapping.md)
- [requires mba-expand-targetable-opcodes-mov-rr-not](mba-expand-targetable-opcodes-mov-rr-not.md)
