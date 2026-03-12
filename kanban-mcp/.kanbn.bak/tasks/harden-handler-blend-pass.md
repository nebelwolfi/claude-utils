---
created: 2026-03-10T03:41:47.431Z
updated: 2026-03-10T03:42:23.645Z
completed: 2026-03-10T03:41:47.431Z
---

# Harden HandlerBlendPass

## Overview

Three improvements: encrypted trampoline stubs, variable-size trampolines, and interleaved handler code with decoys.

## Improvement 1: Encrypted Trampoline Stubs

5-byte E9 rel32 JMPs are trivially followed by static analysis.
- XOR-encrypt each 5-byte stub with per-stub key from RNG
- Force first byte to invalid opcode (triggers STATUS_ILLEGAL_INSTRUCTION)
- VEH handler (~80-120 bytes PIC): catches exception, checks if fault addr is in trampoline range, decrypts in-place, resumes
- VEH registered via loader stub or TLS callback (before any trampoline execution)
- Key table: N * 5 bytes appended after encrypted stubs
- Requires .pecker section IMAGE_SCN_MEM_WRITE for in-place decrypt
- New file `handler_blend_veh.h` for PIC VEH code generator

## Improvement 2: Variable-Size Trampolines with Junk Padding

Fixed 5-byte stride is a strong signature for pattern matching.
- Per-slot random size: min_trampoline_size to max_trampoline_size (default 8-32 bytes)
- Layout: `[EB nn short JMP][pre-junk][E9 rel32][post-junk]`
- Junk from `anti_decompile::emitFakeCodePadding()` (structured fake code, not just NOPs)
- Dispatch table uses per-slot entry offsets (not computed from index * stride)

## Improvement 3: Interleaved Handler Code with Decoy Fragments

Handlers are contiguous blobs with 0xCC padding - easy to identify boundaries.
- Split each handler into 2-4 chunks at instruction boundaries (via HDE64)
- Each chunk ends with JMP rel32 to next chunk
- Scatter chunks across the section, interleaved with decoy fragments
- Decoy fragments mimic real handler patterns (MOVZX from bytecode, register loads via [RBX+offset], fake flag extraction, fake dispatch JMP [R12+RCX*8])
- 5 decoy templates: FakeAluHandler, FakeMoveHandler, FakeStackOp, FakeMemoryAccess, FakeComparison
- New file `handler_blend_decoy.h` for decoy fragment generator

## Key Files

- `include/PEcker/obfuscation/handler_blend.h` - all 3 improvements in applyTrampoline()
- New `include/PEcker/obfuscation/handler_blend_veh.h` - VEH handler code generator
- New `include/PEcker/obfuscation/handler_blend_decoy.h` - decoy fragment generator
- `include/PEcker/obfuscation/anti_decompile.h` - reuse emitFakeCodePadding()
- `include/PEcker/commands/cmd_protect.h` - section characteristics + VEH registration

## Implementation Order

1. Variable-size trampolines (simplest, trampoline table only)
2. Encrypted trampolines (adds VEH + encryption)
3. Interleaved handler code (most complex, handler splitting + decoys)
