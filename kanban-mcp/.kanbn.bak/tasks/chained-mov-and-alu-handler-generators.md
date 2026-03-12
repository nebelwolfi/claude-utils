---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T21:01:17.019Z
started: 2026-03-03T15:19:05.937Z
completed: 2026-03-03T21:00:45.553Z
tags:
  - handlers
  - codegen
  - chained
---

# Chained: MOV and ALU handler generators

Machine code generators for all MOV and arithmetic/logic handlers. Each: decode operands, execute, optional flag update via CALL to shared helper, advance RIP, inlined dispatch-next.

## Sub-tasks

- [x] MOV_RR (3 bytes: op+dst+src) - regs[dst] = regs[src]
- [x] MOV_RI (10 bytes: op+dst+imm64) - regs[dst] = imm64
- [x] MOV_RM (3 bytes: op+dst+addr) - regs[dst] = *(u64*)(regs[addr])
- [x] MOV_MR (3 bytes: op+addr+src) - *(u64*)(regs[addr]) = regs[src]
- [x] MOV_RM32, MOV_MR32 - 32-bit load (zero-extend) / store
- [x] MOV_RM16, MOV_MR16 - 16-bit load (zero-extend) / store
- [x] MOV_RM8, MOV_MR8 - 8-bit load (zero-extend) / store
- [x] ADD (3 bytes) - regs[dst] += regs[src], CALL set_arith_flags
- [x] SUB (3 bytes) - regs[dst] -= regs[src], CALL set_arith_flags(is_sub=1)
- [x] MUL (3 bytes) - regs[dst] *= regs[src]
- [x] ADD_NF (3 bytes) - regs[dst] += regs[src], no flag update
- [x] XOR, AND, OR (3 bytes each) - bitwise op, CALL set_logic_flags
- [x] NOT (2 bytes: op+dst) - regs[dst] = ~regs[dst]
- [x] SHL, SHR, SAR, ROL, ROR (3 bytes each) - shift/rotate, CALL set_logic_flags where applicable
- [x] ADC, SBB (3 bytes each) - add/sub with carry/borrow from RFLAGS
- [x] INC, DEC (2 bytes each) - +/-1, CALL set_inc_dec_flags (preserves CF)
- [x] CMP (3 bytes) - subtract without storing, CALL set_arith_flags
- [x] TEST (3 bytes) - AND without storing, CALL set_logic_flags
- [x] DIV_U, DIV_S (3 bytes each) - unsigned/signed division, zero-check then JMP error handler
- [x] MOD_U, MOD_S (3 bytes each) - unsigned/signed modulo, zero-check then JMP error handler
