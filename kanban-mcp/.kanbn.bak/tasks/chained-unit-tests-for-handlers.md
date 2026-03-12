---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T20:21:06.731Z
started: 2026-03-03T16:59:02.778Z
completed: 2026-03-03T20:20:21.006Z
tags:
  - tests
  - chained
---

# Chained: Unit tests for handlers

Create `tests/chained_tests.cpp` with test suite `chained.*`.

## Sub-tasks

- [x] Add chained_tests.cpp to CMakeLists.txt PEcker_tests sources
- [x] Test handler code generation: verify all 49 handlers produce non-empty valid code
- [x] Test dispatch_offsets table: 256 entries, all valid opcodes map to correct handler, invalid opcodes map to error handler
- [x] Test dispatch_offsets with mutation: verify inverse_map is correctly applied
- [x] Test handler shuffling: two different seeds produce different handler orderings
- [x] Test micro-sequence: MOV_RI R0, 42 then HALT (allocate context, build dispatch table, execute, verify R0==42)
- [x] Test micro-sequence: MOV_RI R0, 10 then MOV_RI R1, 20 then ADD R0, R1 then HALT (verify R0==30, flags set)
- [x] Test conditional jumps: MOV_RI + CMP + JZ/JNZ sequences
- [x] Test PUSH/POP: push values, pop them back, verify order
- [x] Test CALL/RET: subroutine call with return
- [x] Test TRY/ENDTRY: exception frame push/pop
- [x] Test error paths: DIV by zero, stack overflow, invalid opcode
- [x] Test memory access: MOV_RM/MOV_MR with valid address
