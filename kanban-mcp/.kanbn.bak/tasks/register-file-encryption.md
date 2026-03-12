---
created: 2026-03-04T13:25:16.994Z
updated: 2026-03-06T14:48:38.805Z
started: 2026-03-06T11:22:48.819Z
completed: 2026-03-06T14:47:41.677Z
priority: high
tags:
  - vm-hardening
  - encryption
  - registers
---

# Register File Encryption

## Overview

Encrypt VM register values at rest in VmContext with a per-handler rotating XOR key. Decrypt on handler entry, re-encrypt on exit. Forces attacker to instrument every handler to see register state.

## Files

- **Modify**: `vm_context.h` (add `reg_encrypt_key`, `readReg()`/`writeReg()`)
- **Modify**: `vm_engine.h` (~300 handler sites across 3 dispatch functions)
- **Modify**: `vm_engine_flat.h` (FlatVmContext field, `flat_reg_read()`/`flat_reg_write()`, ~300 handler sites across 3 flat interpreters)
- **Modify**: `entry_stub.h` (CTX_SIZEOF 12856→12864, new offset, init key + pre-encrypt initial registers)
- **Modify**: `chained_handlers.h` (Phase 2: R14 as cached key register, shared decrypt/encrypt subroutines, ~50 handlers)

## Key Design

- **Encryption**: `reg[i] = val ^ ROTL(master_key, i)` where `i` is the register index
- **Key rotation**: `master_key = ROTL(master_key, 7) ^ opcode_byte` after each dispatch iteration
- **readReg(id)**: `return reg[id] ^ ROTL(key, id)`
- **writeReg(id, val)**: `reg[id] = val ^ ROTL(key, id)`
- **NATIVE_CALL critical edge case**: Must decrypt all argument registers to plaintext before Win64 ABI call, re-encrypt on return
- **Post-execution**: Decrypt loop to extract final register values before returning to caller
- **Performance**: ~2 CPU cycles per register access (XOR + rotate), negligible vs dispatch overhead
- Entry stub must pre-encrypt initial register values (ABI arguments + zero-init registers)

## Phases

- Phase 1: VmContext + vm_engine.h + vm_engine_flat.h + entry_stub.h
- Phase 2: chained_handlers.h (raw x86-64 machine code, most complex)

## Sub-tasks

- [x] Add reg_encrypt_key field + readReg/writeReg methods to vm_context.h
- [x] Update all ~300 handler sites in vm_engine.h (3 dispatch modes)
- [x] Add blind_mask to FlatVmContext, flat_reg_read/flat_reg_write helpers in vm_engine_flat.h
- [x] Update all ~300 handler sites in vm_engine_flat.h (3 flat interpreters)
- [x] Update entry_stub.h: CTX_SIZEOF, offset, emit key init + pre-encrypt initial regs
- [x] Handle NATIVE_CALL: decrypt args before call, re-encrypt on return
- [x] Add post-execution decrypt loop in entry stub epilogue
- [x] Phase 2: Update chained_handlers.h (~50 handlers, R14 key register, shared subroutines)
- [x] Create tests for encrypt/decrypt round-trip correctness
