---
created: 2026-03-10T14:08:50.336Z
updated: 2026-03-11T07:00:31.472Z
started: 2026-03-10T20:36:13.528Z
completed: 2026-03-11T07:00:31.472Z
---

# Harden EncodingVariancePass

## Overview

Two improvements: instruction scheduling variance and register renaming within basic blocks.

## Improvement 1: Instruction Scheduling Variance

Reorder independent instructions within basic blocks to break instruction-sequence signatures.
- Build per-instruction read/write sets: which registers are read, which written, flag dependencies
- Classify all ~54 opcodes into read/write categories (e.g., VM_ADD reads dst+src, writes dst+RFLAGS)
- Two instructions are independent if: no RAW, WAR, or WAW hazards on registers or flags
- Within each basic block, build a dependency DAG
- Topological sort with random tie-breaking (RNG picks among ready instructions)
- Reconstruct bytecode in the new order, preserving original semantics
- `instruction_scheduling` bool + `scheduling_probability` float in config

## Improvement 2: Register Renaming Within Blocks

Map virtual registers to different physical registers per block.
- Build a per-block register usage map (which registers are live-in, live-out, internal-only)
- For internal-only registers: assign a random permutation from unused registers
- Emit a prologue (MOV renames) at block start and epilogue (MOV un-renames) at block end
- Protected registers: RSP (16), RFLAGS (17), RIP (18), SCRATCH0-3 (20-23) - never rename
- Registers that are live-in or live-out cannot be renamed without coordination with adjacent blocks
- Only rename registers that are both written and last-read within the same block
- Handle cycles via XOR-swap or PUSH/POP: `XCHG a,b = XOR a,b; XOR b,a; XOR a,b`

## Key Files

- `include/PEcker/obfuscation/encoding_variance.h` - both improvements
- `include/PEcker/common/opcodes.h` - register/opcode definitions (reference, no changes)
- `include/PEcker/obfuscation/block_reorder.h` - reuse identifyBlocks() logic
- `tests/encoding_variance_tests.cpp` - ~19 new tests
- `include/PEcker/cli/pipeline.h` - wire new config fields

## Constraints

- Instructions with side effects (NATIVE_CALL, MOV_MR, MOV_RM) cannot be reordered past each other
- RFLAGS-producing instructions (ALU ops) cannot be reordered past RFLAGS-consuming instructions (Jcc, SETcc)
- PUSH/POP have implicit stack ordering dependency
- Nanomite traps cannot be reordered

## Sub-tasks

- [x] Build per-opcode read/write set classification for all ~54 opcodes
- [x] Implement dependency DAG construction within basic blocks
- [x] Implement topological sort with random tie-breaking for instruction scheduling
- [x] Add instruction_scheduling bool and scheduling_probability float to EncodingVarianceConfig
- [x] Implement per-block register usage analysis (live-in, live-out, internal-only)
- [x] Implement register renaming with prologue/epilogue MOV emissions
- [x] Handle renaming cycles via XOR-swap (3 XORs) or PUSH/POP
- [x] Protect special registers: RSP, RFLAGS, RIP, SCRATCH0-3 from renaming
- [x] Wire new config fields through pipeline.h and args.h
- [x] Write scheduling tests (independent instructions reordered, dependent preserved)
- [x] Write register renaming tests (internal-only renamed, live-in/out preserved)
- [x] Write combined scheduling+renaming tests with pipeline composition
