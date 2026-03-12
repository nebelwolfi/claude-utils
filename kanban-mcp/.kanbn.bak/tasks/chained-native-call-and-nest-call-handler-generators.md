---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T16:34:16.370Z
started: 2026-03-03T16:10:19.288Z
completed: 2026-03-03T16:33:31.034Z
tags:
  - handlers
  - codegen
  - chained
---

# Chained: NATIVE_CALL and NEST_CALL handler generators

Most complex handlers - must set up Win64 ABI call frames with proper RSP alignment, shadow space, and argument marshaling. ~120-180 bytes each.

## Notes

Win64 ABI requirements for NATIVE_CALL:
- RSP must be 16-byte aligned before CALL instruction
- 32-byte shadow space at [RSP], [RSP+8], [RSP+16], [RSP+24]
- Args: RCX (from ctx->regs[1]), RDX (regs[2]), R8 (regs[8]), R9 (regs[9])
- 5th+ args on stack from VM scratch area
- Return value in RAX to ctx->regs[0]

Since RBX, R12, R13 are callee-saved in Win64, the native callee preserves them. But save/restore defensively in case of non-conforming callees.

## Sub-tasks

- [x] NATIVE_CALL (9 bytes: op+imm64) - decode function pointer from bytecode imm64, save RBX/R12/R13 (callee-saved but be safe), load args from VM regs: RCX=R1, RDX=R2, R8=R8, R9=R9 (plus stack args from VM stack area), sub rsp for shadow+alignment, CALL native, restore rsp, store RAX to regs[0], restore RBX/R12/R13, advance RIP, dispatch-next
- [x] NATIVE_CALL_REG (2 bytes: op+reg) - same as NATIVE_CALL but function pointer from regs[reg]
- [x] NATIVE_JMP_REG (2 bytes: op+reg) - tail call: load address from regs[reg], set status=HALTED, store address info, RET to entry stub
- [x] NEST_CALL (9 bytes: op+imm64) - pass FlatVmContext* (RBX) as RCX (first arg), decode function pointer from imm64, CALL it, advance RIP, dispatch-next
