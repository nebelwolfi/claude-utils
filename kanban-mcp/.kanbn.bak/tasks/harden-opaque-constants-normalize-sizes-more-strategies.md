---
created: 2026-03-03T20:18:15.275Z
updated: 2026-03-03T20:18:15.275Z
priority: high
tags:
  - hardening
  - opaque-constants
  - polymorphic
---

# Harden: OpaqueConstants - normalize sizes + more strategies

Each of 3 opaque constant strategies has a fixed byte size (XorChain=47, Polynomial=80, MBA=34). Analyst can signature by size alone. All use hardcoded R14/R15.

## Changes

**1. Normalize sizes:**
Pad all strategies to a target range (64-80 bytes) by inserting NOP/dead instructions between core operations. The padding amount is randomized so no two expansions are identical in size.

**2. Random scratch register selection:**
Replace hardcoded R14/R15 with randomly selected registers from R0-R15 (excluding the destination register). Different scratch registers per expansion instance.

**3. Add new strategies (2-3 more):**
- **BitShift strategy:** Compute constant via series of SHL/SHR/OR operations. E.g., build value bit-by-bit: `MOV S, 0; OR S, (bit_63 << 63); OR S, (bit_62 << 62); ...` (subset of bits, not all 64).
- **AddSub strategy:** Start from random base K, apply a chain of ADD/SUB with random offsets that net to the target value. `MOV S, K; ADD S, A; SUB S, B; ADD S, C` where `K + A - B + C = target`.
- **RotateXor strategy:** Build value using ROL/ROR/XOR chain. `MOV S, K1; ROL S, N; XOR S, K2; ROR S, M` where the chain evaluates to the target.

**4. Interleave instructions:**
Instead of emitting the strategy as a contiguous block, interleave core instructions with unrelated dead operations (dead MOV, NOP, push/pop of unrelated registers). Breaks the contiguous pattern.

**Files:** `include/PEcker/obfuscation/opaque_constants.h`

## Sub-tasks
- [x] Add random NOP/dead padding to normalize sizes to 64-80 byte range
- [x] Randomize scratch register selection (not R14/R15)
- [x] Implement BitShift strategy (SHL/SHR/OR chain)
- [x] Implement AddSub strategy (random base + offset chain)
- [x] Implement RotateXor strategy (ROL/ROR/XOR chain)
- [x] Interleave core instructions with dead operations

