---
created: 2026-03-04T18:15:25.628Z
updated: 2026-03-04T18:15:25.628Z
tags:
  - entry-stub
  - MBA
  - anti-pattern-matching
---

# Obfuscated Immediate Values in Entry Stubs

Replace plaintext MOV imm32/imm64 instructions with MBA-derived computations. Hides context size, bytecode size, encryption mode, field offsets, and allocation constants from static analysis.

**9 Target Immediates**: CTX_SIZEOF/8 (1607), bytecode_size, SHADOW (32), context field offsets (192,200,208,216,248...), encryption_mode (1/2), stack arg copy count (16), STACK_ALLOC (~29552), nanomite/flow counts, flow_initial_chain_state (64-bit).

**6 Encoding Strategies** (selected per-immediate via RNG):
- XOR split: `MOV EAX, A; XOR EAX, B` (A^B=val) - 10 bytes
- ADD split: `MOV EAX, A; ADD EAX, B` (A+B=val) - 10 bytes
- SUB split: `MOV EAX, A; SUB EAX, B` (A-B=val) - 10 bytes
- NOT: `MOV EAX, ~val; NOT EAX` - 7 bytes
- LEA trick: `MOV EAX, base; LEA EAX, [RAX+disp]` - 11 bytes
- 64-bit XOR: `MOV RAX, A; MOV RCX, B; XOR RAX, RCX` - 23 bytes

**New file**: obfuscated_imm.h with `emitObfuscatedMovEax()`, `emitObfuscatedMovEcx()`, `emitObfuscatedMemStore32/64()`, `emitObfuscatedAddRsp()`.

**Scratch regs**: RAX primary (dead at all call sites), RCX secondary (dead after REP STOSQ). RFLAGS freely clobbered.

**Activation**: `obfuscate_immediates` param + `diversity_seed != 0`.

**Key files**: new obfuscated_imm.h, entry_stub.h (9 replacement sites), cmd_protect.h (pass flag)

## Sub-tasks
- [ ] Create obfuscated_imm.h with encoding strategy functions in pecker::obfusc_imm namespace
- [ ] Implement emitObfuscatedMovEax() with 5 strategy variants (XOR/ADD/SUB/NOT/LEA)
- [ ] Implement emitObfuscatedMovEcx() using RAX as scratch
- [ ] Implement emitObfuscatedMemStore32() computing val into EAX then storing
- [ ] Implement emitObfuscatedMemStore64() using RAX+RCX scratch
- [ ] Implement emitObfuscatedMovRax64() for 64-bit values (flow_chain_state)
- [ ] Implement emitObfuscatedAddRsp() for epilogue stack restore
- [ ] Add obfuscate_immediates parameter to generateEntryStub()
- [ ] Replace 9 plaintext immediate sites with conditional obfuscated emission
- [ ] Apply same changes to generateChainedEntryStub()
- [ ] Wire config flag through cmd_protect.h
- [ ] Write test: disabled mode matches default byte-for-byte
- [ ] Write test: obfuscated stubs are larger
- [ ] Write test: CTX_SIZEOF/8 value (1607) not present as plaintext imm32
- [ ] Write test: bytecode_size not present as plaintext imm32
- [ ] Write test: STACK_ALLOC not present as plaintext imm32
- [ ] Write test: fixups remain valid
- [ ] Write test: deterministic for same seed

