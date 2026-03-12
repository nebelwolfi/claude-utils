---
created: 2026-02-26T20:21:59.906Z
updated: 2026-03-02T17:26:37.488Z
started: 2026-02-27T20:08:53.609Z
completed: 2026-02-28T00:50:12.444Z
---

# Anti-decompile: gadget code generation library

Create include/PEcker/obfuscation/anti_decompile.h. 5 gadget generators: emitStackUnbalance (mismatched SUB/ADD RSP with net delta 0), emitOpaqueJump (LEA+ADD+JMP RAX), emitOverlappingInsn (EB 01 + crafted multi-byte), emitOpaqueConstant (MOV+XOR chain), emitFakePrologue (PUSH RBP;MOV RBP,RSP;SUB RSP,N;JMP over dead RET). All register/flag-preserving.
