---
created: 2026-03-11T22:54:16.979Z
updated: 2026-03-11T22:54:16.979Z
tags:
  - lifter
  - indirect-call
  - function-pointer
  - new-instruction
---

# Lifter: indirect call / function pointer support

4 golden rule test failures in `func_ptr` corpus (exit 0xD = permission denied). Function pointers and indirect calls (`CALL reg`, `CALL [mem]`) need lifting support.
