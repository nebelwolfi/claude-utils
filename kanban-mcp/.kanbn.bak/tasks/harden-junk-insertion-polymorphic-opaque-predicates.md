---
created: 2026-03-03T20:17:49.403Z
updated: 2026-03-03T20:17:49.403Z
priority: high
tags:
  - hardening
  - junk-insertion
  - polymorphic
---

# Harden: JunkInsertion - polymorphic opaque predicates

The opaque predicate pattern in `junk_insertion.h` is always exactly 26 bytes with a fixed structure: `PUSH RFLAGS; PUSH Rscr; MOV_RI Rscr,K; CMP Rscr,Rscr; JNZ +9; POP Rscr; POP RFLAGS`. Trivially signatured.

## Changes

**1. Multiple predicate variants (4+):**
- **V0 (current):** CMP reg,reg → JNZ (compare equal, never jumps)
- **V1:** `MOV_RI S, K; MOV_RI S2, K; SUB S, S2; JNZ` (subtract equal values → always 0)
- **V2:** `MOV_RI S, K; AND S, 0; JNZ` (AND with 0 → always 0, different structure)
- **V3:** `MOV_RI S, K; XOR S, S; JNZ` (XOR self → always 0)
- **V4:** `MOV_RI S, K; MOV_RI S2, K+1; CMP S, S2; JZ` (compare unequal → never jumps via JZ. Inverted condition!)

**2. Random scratch register selection:**
Current: always R14 or R15. Change to random from R0-R15 (excluding special regs), with PUSH/POP.

**3. Variable predicate size:**
Add optional NOP padding (1-8 bytes) between predicate instructions to vary total size from 20-40 bytes. Defeats size-based signature detection.

**4. Vary the branch offset:**
Current: always JNZ +9. Insert variable-length dead code in the "never taken" path (not just empty), making the skip offset unpredictable.

**Files:** `include/PEcker/obfuscation/junk_insertion.h`

## Sub-tasks
- [x] Implement 4 new opaque predicate variants (V1-V4)
- [x] Randomize scratch register selection (not just R14/R15)
- [x] Add variable NOP padding between predicate instructions (20-40 byte range)
- [x] Vary branch offset with dead code in never-taken path
- [x] Update generateOpaquePredicate to accept RNG and select variant randomly

