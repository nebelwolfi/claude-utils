---
created: 2026-03-04T13:27:37.230Z
updated: 2026-03-04T13:27:37.230Z
tags:
  - obfuscation
  - constants
  - blinding
---

# Constant Blinding

## Overview
XOR all `imm64` values in `VM_MOV_RI` instructions with a per-instruction derived mask to hide meaningful constants from static analysis. Zero code expansion.

## Files
- **Create**: `include/PEcker/obfuscation/constant_blinding.h`
- **Create**: `tests/constant_blinding_tests.cpp`
- **Modify**: `compiler/bytecode.h` (blind_mask field), `vm_context.h`, `vm_engine.h` (MOV_RI handler × 3), `vm_engine_flat.h` (FlatVmContext + MOV_RI × 3), `chained_handlers.h` (MOV_RI variants), `entry_stub.h` (CTX_SIZEOF + mask store), `cli/pipeline.h`, `commands/cmd_protect.h`

## Blinding Scheme
- `effective_mask(ip) = blind_mask ^ (ip × 0x00000100000001B3)` (FNV prime)
- Per-instruction unique mask - recovering one doesn't decode others
- **Build-time**: `encoded_imm = original_imm ^ effective_mask(offset)`
- **Runtime**: `decoded_imm = encoded_imm ^ effective_mask(ip)`
- blind_mask: per-build random u64, guaranteed nonzero

## VM Handler Changes
- vm_engine.h MOV_RI handler: `if (ctx.blind_mask) imm ^= ctx.blind_mask ^ (ip * FNV_PRIME)`
- vm_engine_flat.h: same in all 3 PIC interpreters
- chained_handlers.h: ~35-40 bytes of inline x86-64 per MOV_RI variant (load mask from ctx, IMUL ip×prime, XOR)
- entry_stub.h: store mask via two `MOV DWORD [ctx+offset], imm32` (14 bytes)

## Pass Implementation
- Linear scan of bytecode, find MOV_RI opcodes
- Skip relocatable immediates (binary search in reloc_offsets)
- XOR imm64 in-place - zero size change, zero offset change

## Pipeline: after encvar, before mutate
- Complements OpaqueConstantPass (opaque eliminates originals, blinding hides decomposition components)
- Flow-sensitive interaction: build-time blind→encrypt, runtime decrypt→unblind (LIFO order, clean)
- ~11 test cases

## Sub-tasks
- [ ] Create constant_blinding.h: ConstantBlindingPass with reloc-aware bytecode scan
- [ ] Add blind_mask field to BytecodeProgram and VmContext
- [ ] Modify VM_MOV_RI handler in vm_engine.h (3 dispatch modes)
- [ ] Modify VM_MOV_RI handler in vm_engine_flat.h (3 PIC interpreters) + FlatVmContext field
- [ ] Modify chained_handlers.h MOV_RI variants (~35 bytes inline unblinding)
- [ ] Update entry_stub.h: CTX_SIZEOF, offset, emit 2×MOV DWORD to store mask
- [ ] Wire into pipeline.h and cmd_protect.h (after encvar, before mutate)
- [ ] Create tests/constant_blinding_tests.cpp (~11 tests)

