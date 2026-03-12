---
created: 2026-03-10T17:30:20.261Z
updated: 2026-03-10T17:34:02.872Z
completed: 2026-03-10T17:34:02.872Z
tags:
  - hardening
  - junk-insertion
  - existing-pass
---

# Harden JunkInsertionPass

## Overview

Three improvements: runtime-dependent opaque predicates, correlated junk, and fake function calls.

## Shared Preamble

Both improvements 1 and 2 need a bytecode preamble at offset 0 that initializes memory slots:
- Store known constant at [RSP + opaque_offset] (for opaque predicates)
- Store correlated seed at [RSP + correlated_offset] (for correlated junk)
- Uses existing opcodes (MOV_RI, ADD_NF, MOV_MR); ~64 bytes
- RSP must point to valid writable memory (production: entry stub scratch; tests: allocated buffer)

## Improvement 1: Runtime-Dependent Opaque Predicates

Current `CMP reg,reg` is trivially provable. Replace with memory-dependent comparison.
- `CMP Rscr, [RSP + offset]` where the memory value was written by the preamble
- Static analyzer cannot prove the memory load returns the known value (needs alias analysis)
- Pattern: PUSH RFLAGS, compute address, MOV_RM load, CMP against immediate, JNZ skip, POP RFLAGS
- `use_runtime_opaque` flag + `runtime_opaque_offset` config

## Improvement 2: Correlated Junk (Dataflow-Linked Dead Computation)

Dead code that writes to memory and is later read - forces dataflow analysis.
- Circular pipeline: Block A computes f(seed) → store to [RSP+correlated_offset]; Block B reads → g(prev) → store back
- Each block: MOV_RM (load prev), random ALU op (ADD/XOR/MUL), MOV_MR (store result)
- Creates artificial dataflow chain that can't be eliminated without proving non-aliasing
- `use_correlated_junk` flag + `correlated_offset` config

## Improvement 3: Fake Function Calls

Insert VM_NATIVE_CALL to no-op stubs that look like real API calls.
- Add `native_stubs` vector to BytecodeProgram (move NativeStub from ir.h to common header)
- Generate fake stubs: XOR EAX,EAX (return 0), MOV [RSP+8],RCX (shadow write), MOV RAX,RCX (identity), NOP sled
- Wrap in PUSH R0/R1/R2 + NATIVE_CALL + POP (zero effect on program state)
- Use PECK sentinel encoding; cmd_protect.h merges fake stubs into per-function stub list
- Indistinguishable from real NATIVE_CALL at section level

## Key Files

- `include/PEcker/obfuscation/junk_insertion.h` - all 3 improvements
- `include/PEcker/compiler/bytecode.h` - add native_stubs field
- `include/PEcker/commands/cmd_protect.h` - merge fake stubs into per-function lists
- `tests/obfuscation_tests.cpp` - ~19 new tests

## Test Considerations

- Tests need valid RSP: `ctx.reg(RegId::RSP) = (u64)&test_stack_buf[32768]`
- Fake call tests verify bytecode structure (PECK sentinels) without full execution
