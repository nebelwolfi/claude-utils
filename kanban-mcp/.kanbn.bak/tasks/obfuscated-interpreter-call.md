---
created: 2026-03-04T18:13:20.167Z
updated: 2026-03-06T14:44:34.351Z
started: 2026-03-06T13:47:11.416Z
completed: 2026-03-06T14:43:50.291Z
tags:
  - entry-stub
  - anti-pattern-matching
  - control-flow
---

# Obfuscated Interpreter Call

Replace the obvious `LEA RAX,[RIP+disp]; LEA RCX,[RSP+32]; CALL RAX` (14-byte signature) with obfuscated alternatives hiding the interpreter address and calling convention.

**4 Modes** (selected per-stub via diversity_seed):

0. **Direct** (current): LEA+LEA+CALL RAX - backward compat when seed=0
1. **SplitXor**: LEA into RAX, then junk ADD/SUB/XOR pairs that cancel out (e.g., `ADD RAX, K; SUB RAX, K` or `XOR RAX, K; XOR RAX, K`). Same fixup model. +12 bytes.
2. **RegisterRotation**: Random call target register (RAX/R10/R11) + obfuscated context pointer via `MOV RCX, RSP; ADD RCX, SHADOW` instead of direct LEA. Different LEA encodings per register.
3. **PushRet**: Replace CALL with `PUSH return_addr; PUSH target; RET` - defeats call-graph analysis. Manually compute return landing pad via `LEA R11,[RIP+partial]; ADD R11, remainder`. +15-20 bytes.

**Fixup model**: All modes use single `interpreter_lea_fixup` pointing to the same RIP-relative disp32. Section builder patches identically. Only encoding bytes before the fixup change per register.

**.pdata**: Unaffected - all modes emit after prolog_size. Win64 ABI: RCX must hold ctx* when control transfers.

**Scope**: Flat VM entry stubs only. Chained stubs have different dispatch pattern (MOVZX+CALL[table]) - separate future work.

**Key files**: entry_stub.h (InterpreterCallMode enum + emitter), cmd_protect.h (pass seed), config.h (flag)

## Sub-tasks

- [x] Add InterpreterCallMode enum (Direct, SplitXor, RegRotation, PushRet) to entry_stub.h
- [x] Implement emitObfuscatedInterpreterCall() dispatcher in stub_detail namespace
- [x] Implement Mode 0 (Direct): extract current code as baseline
- [x] Implement Mode 1 (SplitXor): LEA + junk ADD/SUB/XOR pairs that cancel
- [x] Implement Mode 2 (RegRotation): variable call target register (RAX/R10/R11) + obfuscated ctx ptr
- [x] Implement Mode 3 (PushRet): PUSH return_addr + PUSH target + RET with split displacement
- [x] Add call_obfuscation_seed parameter to generateEntryStub()
- [x] Derive per-function call_obfuscation_seed from diversity_seed in cmd_protect.h
- [x] Add obfuscate_interpreter_call flag to PeckerConfig + CLI parsing
- [x] Add to --shizo preset
- [x] Write test: Mode 0 contains CALL RAX (FF D0)
- [x] Write test: nonzero seed produces different stub bytes
- [x] Write test: fixup offset still points to valid LEA instruction
- [x] Write test: stub ends with RET (0xC3) in all modes
- [x] Write test: all modes HDE64-decodable
- [x] Write test: PushRet mode has no FF D0 (CALL RAX) byte pair
