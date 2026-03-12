---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T19:52:48.653Z
started: 2026-03-03T16:36:50.456Z
completed: 2026-03-03T17:31:03.010Z
tags:
  - stub
  - chained
---

# Chained: Entry stub generator

Add `generateChainedEntryStub()` to `include/PEcker/stub/entry_stub.h`. Per-function native-to-VM bridge for chained dispatch.

## Sub-tasks

- [x] Define `ChainedEntryStub` struct with fixup fields: bytecode_lea_fixup, handler_blob_lea_fixup, dispatch_offsets_lea_fixup, inverse_map_lea_fixup, encryption_key_lea_fixup, prolog_size
- [x] Reuse existing prologue: push 8 callee-saved regs, save args to R10/R11
- [x] Increase STACK_ALLOC by 2048 bytes for dispatch table (256 x 8 bytes on stack)
- [x] Reuse: stack probe, zero-init FlatVmContext, copy args, set VM RSP, copy stack args, set bytecode ptr/size
- [x] Add inverse_map setup (same as existing, if present)
- [x] Add encryption key copy + inline XOR-rotate decryption loop (~50-60 bytes of emitted machine code) or CALL to decrypt helper in handler blob
- [x] Emit dispatch table initialization: LEA R14 handler_blob_base, LEA RSI dispatch_offsets, LEA R12 stack_slot, loop 256 iterations: load u32 offset, add R14, store u64 to [R12+i*8]
- [x] Set chain registers: LEA RBX [RSP+SHADOW] (FlatVmContext*), MOV R13 [RBX+192] (bytecode ptr)
- [x] Initial dispatch: MOVZX ECX, byte [R13]; CALL [R12+RCX*8] (CALL not JMP - return address for HALT)
- [x] Reuse existing epilogue: extract RAX from ctx->regs[0], add rsp, pop callee-saved, ret
