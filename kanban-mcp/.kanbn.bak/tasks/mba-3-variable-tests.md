---
created: 2026-03-11T15:14:29.114Z
updated: 2026-03-11T15:14:41.955Z
priority: high
tags:
  - mba
  - griffin-style
  - tests
---

# MBA: 3-Variable Tests

Comprehensive test coverage for all new 3-variable MBA features.

**Depends on**: All other MBA: 3-Variable / Griffin-style tasks

**File**: `tests/mba_tests.cpp`

## Sub-tasks
- [ ] Basis identity test: verify `sum(all 8 b_i(x,y,z)) = -1` for 100 random (x,y,z) triples
- [ ] emitBasisTerm3 correctness: test all 8 basis terms with known inputs, verify expected bitwise result
- [ ] 3-var expansion correctness: XOR/AND/OR/ADD/SUB with basis_vars=3, 100 seeds each, verify arithmetic result
- [ ] Nested basis correctness: all 5 ops with nested_basis=true, 100 seeds, verify correct results
- [ ] Expression chaining correctness: all 5 ops with chain_mba=true, 100 seeds, verify correct results
- [ ] Loop programs: fib(10)=55 and sum(1..10)=55 with basis_vars=3 + nested_basis + chain_mba
- [ ] Multi-seed sweep: 50 seeds with full new config on loop programs
- [ ] Edge cases: dst==src, all-zeros, all-ones, overflow/underflow
- [ ] Full pipeline integration: MBA + junk + mutate + encrypt with 3-var options enabled
- [ ] CLI flag parsing: verify --mba-basis-vars, --mba-nested-basis, --mba-chain are parsed correctly


## Relations
- [blocked by mba-3-variable-variant-dispatch-config-plumbing](mba-3-variable-variant-dispatch-config-plumbing.md)

