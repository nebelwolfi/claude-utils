---
created: 2026-03-04T13:27:15.763Z
updated: 2026-03-04T13:27:15.763Z
tags:
  - obfuscation
  - deception
  - honey-token
  - trap
---

# Trap / Honey Token Instructions

## Overview
Insert bytecode sequences that look like high-value targets (serial checks, decryption keys, passwords) inside opaque predicates on never-taken branches. If attacker patches the predicate, the trap corrupts VM state.

## Files
- **Create**: `include/PEcker/obfuscation/honey_token.h`
- **Create**: `tests/honey_token_tests.cpp`
- **Modify**: `common/types.h` (VmStatus::Trapped), `cli/config.h`, `cli/args.h`, `cli/pipeline.h`, `commands/cmd_protect.h`

## Design: No New Opcode (VM_HALT reuse)
- Token blocks end with `MOV_RI R0, sentinel` + `VM_HALT`
- Caller detects `Halted + R0 == sentinel` → promotes to `VmStatus::Trapped`
- Avoids touching 12+ files required for new opcodes
- Honey tokens use existing opcodes → indistinguishable in dump/trace

## 4 Honey Token Patterns
1. **Fake serial/license**: MOV_RI suspicious constant ("LIC_KEY", "REGKEY") → CMP → JNZ → "valid"/"invalid" paths
2. **Fake decryption key**: MOV_RI AES test vector constants → XOR "decrypt rounds"
3. **Fake API resolution**: MOV_RI FNV1a hashes of real Win32 API names → XOR/SHR "table lookup"
4. **Fake string/password**: MOV_RI ASCII "MasterKey", "Password", "Admin" → XOR/OR "derive"

## Opaque Predicate Wrapper
- `CMP Rscr, Rscr` (ZF=1) + `JZ +body_len` (always taken, skips dead body)
- Predicate diversity: CMP/TEST/XOR/SUB variants, randomly selected
- PUSH/POP RFLAGS around wrapper to avoid flag clobbering

## Trap Mechanism
- **Context corruption** (primary): Before HALT, write garbage to return address, scramble RFLAGS, zero RSP
- **Halt sentinel** (secondary): Post-execution check promotes Halted→Trapped, triggers re-randomization

## Pipeline: after junk, before flatten
- Gets further obfuscated by MBA, CFG flatten, mutation, encryption
- Configurable density (default 0.1), deterministic seed
- ~13 test cases

## Sub-tasks
- [ ] Add VmStatus::Trapped to common/types.h
- [ ] Create honey_token.h: HoneyTokenPass with 4 pattern generators
- [ ] Implement opaque predicate wrapper with predicate diversity
- [ ] Implement context corruption trap payload
- [ ] Implement suspicious constants pool (serial, crypto, password, API hash constants)
- [ ] Implement 3-phase apply() with offset fixup (same pattern as junk_insertion)
- [ ] Wire into pipeline.h and cmd_protect.h (after junk, before flatten)
- [ ] Add --honey-token CLI flag + density config + --shizo preset
- [ ] Create tests/honey_token_tests.cpp (~13 tests incl. never-executes verification)

