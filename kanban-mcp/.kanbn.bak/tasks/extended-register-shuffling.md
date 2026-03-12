---
created: 2026-03-11T09:51:27.148Z
updated: 2026-03-11T09:52:00.794Z
tags:
  - entry-stub
  - anti-pattern-matching
  - diversity
  - subtask-9-done
completed: 2026-03-11T09:52:00.794Z
---

# Extended Register Shuffling

Beyond push order permutation: randomize arg save registers, LEA scratch registers, call target register, and zero-init/bulk-copy strategy selection.

**Current hardcoded usage**: R10=save RCX, R11=save RDX, RAX=LEA scratch, RAX=call target, REP STOSQ for zero-init (locks RDI/RSI/RCX), REP MOVSQ for stack-arg copy.

**StubRegAlloc struct**: Maps logical roles to physical registers:
- `arg_save_rcx/rdx`: Any 2 distinct regs from {RBX,RBP,RSI,R10-R15} (9 choices for 2 slots)
- `lea_scratch`: Any GPR except RSP (used after zero-init, everything is dead)
- `call_target`: Any GPR except RSP and RCX (RCX holds ctx*)
- `use_rep_stosq/movsq`: Boolean - when false, use explicit loop alternative (frees RDI/RSI/RCX for other roles)

**Register-parameterized encoding helpers**: `emitMovRR()`, `emitLeaRspDisp32()`, `emitLeaRipDisp32()`, `emitMovToRspDisp32()`, `emitMovFromRspDisp32()`, `emitCallReg()`, `emitXorRR32()`, `emitMovRI32()` - all handle REX prefixes for R8-R15.

**Non-REP alternatives**: Explicit `XOR reg,reg; MOV [base], reg; ADD base,8; DEC counter; JNZ` loop for zero-init. Unrolled 16-qword copy for stack args.

**Activation**: When `diversity_seed != 0`. Uses dedicated RNG stream.

**Key files**: entry_stub.h (encoding helpers, StubRegAlloc, allocateStubRegisters(), non-REP alternatives)
