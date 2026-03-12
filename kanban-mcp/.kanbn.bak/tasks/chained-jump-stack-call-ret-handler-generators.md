---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T16:36:21.688Z
started: 2026-03-03T15:37:00.801Z
completed: 2026-03-03T16:35:36.891Z
tags:
  - handlers
  - codegen
  - chained
---

# Chained: Jump, stack, call/ret handler generators

Machine code generators for control flow, stack, and exception handling opcodes.

## Sub-tasks

- [x] JMP (5 bytes: op+offset32) - set RIP = ip + offset, dispatch-next
- [x] JZ, JNZ (5 bytes) - check ZF in [RBX+RFLAGS], conditionally set RIP or advance by 5
- [x] JL, JG (5 bytes) - check SF/OF/ZF for signed comparisons
- [x] JB, JA (5 bytes) - check CF/ZF for unsigned comparisons
- [x] JS, JNS (5 bytes) - check SF flag
- [x] PUSH (2 bytes: op+reg) - check stack_top < 1024, stack[stack_top++] = regs[reg]
- [x] POP (2 bytes: op+reg) - check stack_top > 0, regs[reg] = stack[--stack_top]
- [x] CALL (5 bytes: op+offset32) - PUSH current RIP+5, set RIP = ip + offset
- [x] RET (1 byte) - if stack_top == 0: JMP halt_handler; else POP RIP
- [x] NOP (1 byte) - advance RIP by 1, dispatch-next
- [x] HALT (1 byte) - JMP halt_handler (set status=HALTED, native RET)
- [x] TRY (5 bytes: op+offset32) - push exception frame (handler_ip, saved stack_top)
- [x] ENDTRY (1 byte) - pop exception frame
