---
created: 2026-03-04T18:14:12.098Z
updated: 2026-03-07T21:52:29.442Z
started: 2026-03-07T21:29:42.768Z
priority: low
tags:
  - entry-stub
  - anti-analysis
  - decoy
completed: 2026-03-07T21:52:29.442Z
---

# Bogus/Decoy Entry Stubs

Generate fake entry stubs interleaved with real ones in the .pecker section. Statically indistinguishable from real stubs - same prologue, epilogue, LEA patterns, .pdata entries. Forces attacker to analyze every stub individually.

**4 Decoy Types**:
- **Full**: Complete structure, wrong bytecode ptr (points to fake bytecode) or wrong encryption key → wrong results
- **Honeypot**: Fake bytecode contains anti-analysis sequences (timing checks, debug detection) → triggers when attacker tries to execute
- **Trap**: Real structure with subtle mutations (off-by-one bytecodeSize, swapped arg registers, wrong VM RSP) → extremely hard to diagnose
- **Dead**: Never called, valid structure with trivial `MOV R0, const; HALT` bytecode

**Fake bytecode generator**: Produces plausible-looking bytecode (MOV_RI loads, ALU sequences, conditional jumps with valid offsets, VM_HALT). Size: 64-2048 bytes. Applies same opcode mapping when handler mutation active.

**Section layout**: Interleave decoys between real stubs (configurable ratio 1-5 per real stub). Each decoy gets: stub code + fake bytecode blob + .pdata entry.

**Fixup targets**: Decoy bytecode_lea → fake bytecode region. Decoy interpreter_lea → REAL interpreter blob (so static cross-refs look valid). Decoy inverse_map/encryption → real or wrong data depending on type.

**Config**: decoy_stubs (bool), decoy_stub_ratio (u32), decoy_stub_types (string: "full,trap,dead").

**Key files**: new decoy_stub.h, cmd_protect.h (section layout + .pdata), chained_handlers.h (reference: existing decoy handler pattern), config.h

## Sub-tasks

- [x] Write test: fake bytecode contains valid opcodes + HALT
