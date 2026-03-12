---
created: 2026-03-03T20:19:28.670Z
updated: 2026-03-03T20:19:28.670Z
tags:
  - hardening
  - anti-decompile
  - polymorphic
---

# Harden: AntiDecompile - polymorphic gadget internals

Each of the 5 anti-decompile gadget types has a fixed byte structure. E.g., Overlapping Instructions is always `EB 01 <trap> 90`, Opaque Constant always uses `XOR RAX, RAX`.

## Changes

**1. Overlapping Instructions variants:**
- V0 (current): `EB 01 <trap> NOP`
- V1: `EB 02 <trap1> <trap2> NOP` (skip 2 bytes instead of 1)
- V2: Use `JMP SHORT +3` with 3 trap bytes
- V3: Use conditional jump (`JZ +1` after known-flag state) instead of unconditional

**2. Opaque Constant variants:**
- V0 (current): `MOV RAX, K; XOR RAX, RAX` (obvious self-XOR)
- V1: `MOV RAX, K; SUB RAX, K` (subtract same value - less obvious)
- V2: `MOV RAX, K1; MOV RCX, K2; XOR RAX, RCX` where K1 ^ K2 = 0 (two different constants)
- V3: `MOV RAX, K; AND RAX, 0` (AND with zero)

**3. Stack Unbalance variants:**
- V0 (current): `PUSHFQ; SUB RSP, N; ADD RSP, N; POPFQ`
- V1: `PUSH RAX; PUSH RAX; POP RAX; POP RAX` (balanced push/pop, different structure)
- V2: `SUB RSP, N; LEA RSP, [RSP+N]` (use LEA instead of ADD)

**4. Fake Prologue variants:**
Randomize frame size, use different registers (RBX instead of RBP for frame pointer), vary NOP sled length in dead epilogue.

**5. Randomize register usage:**
Current: always RAX for opaque constants, always RSP for stack unbalance. Vary register selection per injection site.

**Files:** Anti-decompile gadget implementation (search for `anti_decompile.h`)

## Sub-tasks
- [x] Add 2-3 variants for Overlapping Instructions gadget
- [x] Add 3 variants for Opaque Constant gadget (SUB, dual-XOR, AND)
- [x] Add 2 variants for Stack Unbalance gadget
- [x] Randomize Fake Prologue (frame size, register, NOP length)
- [x] Randomize register selection per gadget injection site

