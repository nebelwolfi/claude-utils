---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T16:09:33.299Z
started: 2026-03-03T15:18:53.866Z
completed: 2026-03-03T16:08:50.702Z
tags:
  - core
  - codegen
  - chained
---

# Chained: Handler code generator infrastructure

Create `include/PEcker/vm/chained_handlers.h` with core structures, register convention, and shared code generation utilities.

## Sub-tasks

- [x] Create `ChainedHandler` struct: `std::vector<u8> code`, `u8 opcode_id`
- [x] Create `ChainedHandlerSet` struct: handlers[49], error_handler, halt_handler, flag_helpers blob, flag helper offsets
- [x] Define register convention constants: `CTX_REG=RBX`, `DISPATCH_TABLE_REG=R12`, `BYTECODE_BASE_REG=R13`
- [x] Implement `emitDispatchNext(c)` - inlined ~15-byte epilogue: load RIP from [RBX+144], add R13, movzx opcode, jmp [R12+RCX*8]
- [x] Implement `emitLoadPC(c)` - load RIP, compute pc = R13 + RIP into RAX
- [x] Implement `emitAdvanceRIP(c, size)` - add qword [RBX+144], imm8
- [x] Implement `emitDecodeReg(c, pc_offset, dest_gpr)` - movzx dest, byte [RAX+offset]
- [x] Implement `emitDecodeImm64(c, pc_offset, dest_gpr)` - mov dest, [RAX+offset]
- [x] Implement `emitDecodeI32(c, pc_offset, dest_gpr)` - movsxd dest, dword [RAX+offset]
- [x] Generate flag helpers: `emitSetArithFlags()` (~50 bytes, ZF+SF+CF+OF, callable via relative CALL)
- [x] Generate flag helpers: `emitSetLogicFlags()` (~20 bytes, ZF+SF only)
- [x] Generate flag helpers: `emitSetIncDecFlags()` (~40 bytes, preserves CF)
- [x] Generate error handler (~40 bytes): check exception_frame_count, dispatch or RET
- [x] Generate halt handler (~10 bytes): set status=HALTED, RET
