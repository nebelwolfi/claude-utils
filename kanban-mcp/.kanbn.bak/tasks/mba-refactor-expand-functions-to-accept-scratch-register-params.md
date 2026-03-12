---
created: 2026-03-03T19:54:19.986Z
updated: 2026-03-04T23:48:49.744Z
started: 2026-03-03T20:31:07.202Z
completed: 2026-03-04T23:48:21.929Z
priority: high
tags:
  - mba
  - refactor
  - core
---

# MBA: Refactor expand functions to accept scratch register params

Refactor all existing `expandAdd`, `expandSub`, `expandXor`, `expandAnd`, `expandOr` to accept `RegId s0, RegId s1` instead of hardcoded R14/R15. Rename them to `expandAddV0`, etc. Replace all `RegId::R14` / `RegId::R15` references inside each function with `s0` / `s1`.

Also replace the `SHL-by-1` pattern (`vMovRI(v, dst, 1); vShl(v, s1, dst)`) with `vAlu(v, Opcode::VM_ADD, s1, s1)` (ADD-self = double) to eliminate the telltale constant `1`.

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Rename expandAdd→expandAddV0 etc, add s0/s1 params
- [x] Replace RegId::R14/R15 with s0/s1 in all 5 expand functions
- [x] Replace MOV_RI+SHL with ADD-self in expandAddV0 and expandSubV0
