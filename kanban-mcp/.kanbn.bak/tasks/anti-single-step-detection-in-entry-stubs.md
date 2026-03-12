---
created: 2026-03-04T18:16:23.911Z
updated: 2026-03-04T18:16:23.911Z
priority: high
tags:
  - entry-stub
  - anti-debug
  - anti-analysis
---

# Anti-Single-Step Detection in Entry Stubs

Insert trap flag checks and timing-based detection within entry stubs to detect single-stepping debuggers. Subtle detection responses corrupt context silently.

**3 Inline Techniques** (pure PIC, no API calls):

1. **PUSHFQ + TF Check** (~36 bytes): `PUSHFQ; POP RAX; BT RAX, 8; JNC clean`. If TF=1 (single-stepping), corrupt encryption key via XOR. Zero false-positive risk (TF only set by debuggers).

2. **RDTSC Timing** (~54 bytes): Two RDTSC reads around 5 NOPs. Delta > 5000 cycles → detected. 300x margin vs normal execution (~15 cycles for 5 NOPs). Save/restore RCX/RDX (clobbered by RDTSC).

3. **CPUID + RDTSC** (~66 bytes): Serialized timing via CPUID pipeline flush. Stronger than bare RDTSC. Higher threshold (~10000 cycles) to account for CPUID overhead. Also saves/restores RBX (clobbered by CPUID).

**2 Injection Points**:
- A: After context setup, before interpreter call - corruption targets: encryption_key[32] at [RSP+248], bytecode_ptr at [RSP+224]
- B: After interpreter return, before epilogue - corruption target: RAX (return value). Must save/restore RAX on clean path.

**Detection Responses** (silent, not obvious):
- Mode 0: XOR encryption_key[0..7] with garbage → bytecode decrypts to invalid opcodes (delayed crash)
- Mode 1: XOR bytecode pointer → interpreter reads from garbage address
- Mode 2: XOR RFLAGS register in context → all VM conditional branches take wrong paths

**Randomization per stub**: Unique XOR mask, technique selection subset, threshold jitter (±20%), check ordering - all from diversity_seed.

**Key files**: new anti_single_step.h, entry_stub.h (2 injection points), config.h (anti_single_step flag + threshold)

## Sub-tasks
- [ ] Create anti_single_step.h with AntiSingleStepConfig struct
- [ ] Implement emitTFCheck(): PUSHFQ + BT + JNC + corruption path (~36 bytes)
- [ ] Implement emitRdtscCheck(): dual RDTSC + delta threshold + corruption (~54 bytes)
- [ ] Implement emitCpuidRdtscCheck(): CPUID-serialized RDTSC variant (~66 bytes)
- [ ] Implement emitPreInterpreterChecks() composing selected techniques
- [ ] Implement emitPostReturnTFCheck() preserving RAX (return value)
- [ ] Implement emitPostReturnRdtscCheck() preserving RAX
- [ ] Implement emitPostInterpreterChecks() composing post-return techniques
- [ ] Add per-stub XOR mask randomization from diversity_seed
- [ ] Add threshold jitter (±20%) from RNG
- [ ] Add injection point A in generateEntryStub() (after context setup, before CALL)
- [ ] Add injection point B in generateEntryStub() (after return extraction, before epilogue)
- [ ] Apply same injection points to generateChainedEntryStub()
- [ ] Add anti_single_step flag + rdtsc_threshold to PeckerConfig + CLI
- [ ] Add to --shizo preset
- [ ] Update c.reserve() for additional ~260 bytes when enabled
- [ ] Write test: byte sequence matches expected instruction encodings
- [ ] Write test: RNG determinism (same seed → same bytes)
- [ ] Write test: clean path execution without debugger produces no corruption
- [ ] Write test: PUSH/POP balanced (RSP unchanged after each technique)
- [ ] Write test: RSP-relative corruption offsets match CTX_ENCRYPTION_KEY_OFFSET

