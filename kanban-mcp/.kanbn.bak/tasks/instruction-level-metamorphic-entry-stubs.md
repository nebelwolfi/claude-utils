---
created: 2026-03-04T18:04:07.103Z
updated: 2026-03-06T18:27:50.756Z
started: 2026-03-06T14:44:47.453Z
completed: 2026-03-06T18:27:11.927Z
priority: high
tags:
  - entry-stub
  - metamorphic
  - anti-pattern-matching
---

# Instruction-Level Metamorphic Entry Stubs

Generate semantically equivalent but syntactically different machine code for each entry stub. No two stubs should look alike at the byte level, defeating YARA rules and pattern matching.

**Architecture**: New `stub_metamorph.h` with StubMetamorphEngine class. Operates as composable layer between logical stub spec and byte emission.

**5 Metamorphic Dimensions**:

1. **Register Allocation**: ScratchAllocator maps logical roles (ArgSave1/2, CallTarget, LeaScratch, ProbeCounter) to physical registers. ArgSave can use any of {RAX, R8-R11, RBX, RBP, RDI, RSI} (callee-saves are pushed). Call target can be any GPR (not just RAX).

2. **Instruction Encoding**: Substitution table per operation. `XOR EAX,EAX` vs `SUB EAX,EAX` vs `MOV EAX,0` vs `AND EAX,0`. `MOV R10,RCX` vs `PUSH RCX;POP R10` vs `LEA R10,[RCX]`. `SUB RSP,imm` vs `LEA RSP,[RSP-imm]`. `CALL RAX` vs `CALL R10` vs `PUSH ret;JMP reg`.

3. **Zero-Init Method**: REP STOSQ vs unrolled MOV loops vs XOR+store loops vs AVX zeroing (separate task handles this in detail).

4. **Instruction Reordering**: Data-independent groups shuffled via seeded Fisher-Yates. Group A: arg copies (4 independent MOVs). Group B: context field inits (bytecode, inverse_map, encryption key - all independent). Group C: VM RSP init vs arg copies.

5. **Dead Code Insertion**: Register-aware junk using only dead registers. Liveness tracking (dead_mask) at each point. Dead MOV, dead ALU, dead LEA, multi-byte NOPs, PUSH/POP pairs, XCHG dead,dead.

**Key constraint**: .pdata pushes must be accurately recorded regardless of push permutation. prolog_size must be correct. Win64 ABI: RCX must hold ctx* when CALL executes.

**Determinism**: All randomness flows from diversity_seed through mt19937.

**Key files**: new stub_metamorph.h, entry_stub.h (integration), cmd_protect.h (fixup verification)

## Sub-tasks

- [x] Create stub_metamorph.h with x86 encoding namespace (register-parameterized emitters)
- [x] Implement emitLeaRipReg() with variable target register and fixup output
- [x] Implement emitMovRegReg64() with multiple variants (MOV/PUSH+POP/LEA)
- [x] Implement emitZeroReg() with multiple variants (XOR/SUB/MOV 0/AND 0)
- [x] Implement emitSubRspImm/emitAddRspImm with SUB/LEA variants
- [x] Implement emitCallReg() for variable call target register
- [x] Implement ScratchAllocator: seed-based role→register mapping with conflict avoidance
- [x] Define ScratchRole enum: ArgSave1, ArgSave2, CallTarget, LeaScratch, ProbeCounter
- [x] Implement LivenessPoint tracker with dead_mask at each injection point
- [x] Implement junk namespace: emitDeadInsn, emitMultiByteNop, emitDeadMovImm, emitPushPop
- [x] Implement instruction reordering: dependency group definition + seeded Fisher-Yates shuffle
- [x] Define reorder Group A (arg copies), Group B (context field inits), Group C (RSP init vs args)
- [x] Integrate metamorphic engine into generateEntryStub() (route through engine when seed!=0)
- [x] Integrate metamorphic engine into generateChainedEntryStub()
- [x] Update fixup recording to be register-aware (variable LEA register changes bytes before fixup)
- [x] Gate existing byte-pattern tests on diversity_seed==0 in entry_stub_tests.cpp
- [x] Write test: two stubs with different seeds produce different byte sequences
- [x] Write test: REP STOSQ signature absent when vary_zero_init active
- [x] Write test: all metamorphic stubs HDE64-decodable
- [x] Write test: in-process execution correctness with metamorphic stubs
- [x] Write test: fixup offsets point to valid LEA instructions regardless of register choice
