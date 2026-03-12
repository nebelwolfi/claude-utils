---
created: 2026-03-03T20:18:44.393Z
updated: 2026-03-03T20:18:44.393Z
tags:
  - hardening
  - encoding-variance
---

# Harden: EncodingVariance - more variants + always-transform

Only 3 transforms, applied selectively. Each is deterministic: `MOV_RI 0` always becomes `XOR reg,reg`, `MOV_RR` always becomes `PUSH/POP`. Untransformed instructions stand out.

## Changes

**1. Multiple encoding variants per instruction type:**
- **MOV_RI zero (currently 1 variant → 3):**
  - V0: `PUSH RFLAGS; XOR reg,reg; POP RFLAGS` (current, 8 bytes)
  - V1: `PUSH RFLAGS; SUB reg,reg; POP RFLAGS` (SUB self = 0, 8 bytes)
  - V2: `AND reg, 0` via `MOV_RI temp, 0; AND reg, temp` (different structure)

- **MOV_RR (currently 1 variant → 3):**
  - V0: `PUSH src; POP dst` (current, 4 bytes)
  - V1: `XOR dst,dst; OR dst,src` (clear then OR, 6 bytes)
  - V2: `PUSH src; PUSH src; POP dst; POP temp` + cleanup (varied size)

- **Stack gaps (currently PUSH R; POP R → add variants):**
  - V0: `PUSH R; POP R` (current)
  - V1: `PUSH R; NOP; POP R` (3 instructions)
  - V2: `MOV_RR R, R` (self-move, 3 bytes - simpler)

**2. Increase transform density:**
Consider defaulting to higher density or always-transform mode for maximum coverage. Untransformed instructions create a detectable contrast.

**Files:** `include/PEcker/obfuscation/encoding_variance.h`

## Sub-tasks
- [x] Add 2 more MOV_RI-zero variants (SUB self, AND zero)
- [x] Add 2 more MOV_RR variants (XOR+OR, double PUSH/POP)
- [x] Add stack gap variants (NOP-padded, self-MOV)
- [x] Randomly select variant per instruction via RNG

