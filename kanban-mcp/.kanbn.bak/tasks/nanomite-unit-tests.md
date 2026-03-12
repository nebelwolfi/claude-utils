---
created: 2026-02-26T20:20:30.294Z
updated: 2026-03-02T03:36:59.525Z
started: 2026-02-26T23:09:33.960Z
completed: 2026-02-26T23:18:15.750Z
---

# Nanomite: unit tests

Create tests/nanomite_tests.cpp (~31 tests). Infrastructure: entry struct, opcode size, encode/decode, opcode map. Pass: empty program, no-jumps, single-jz, all-jcc-types, density control, trap_id uniqueness. VM execution: fib/sum/add across all dispatch modes. Pipeline combos: nanomite+junk/mutate/encrypt/flatten. Edge cases: halt-only, self-loop, relocs.

## Relations

- [requires nanomite-pipeline-and-cli-integration](nanomite-pipeline-and-cli-integration.md)
