---
created: 2026-03-03T20:18:02.874Z
updated: 2026-03-03T20:18:02.874Z
priority: high
tags:
  - hardening
  - cfg-flatten
  - polymorphic
---

# Harden: CfgFlatten - polymorphic dispatcher

The CFG flattening dispatcher has an identical structure every run: `[MOV_RI R14, state; CMP R15, R14; JZ off]` repeated N times. An analyst counts entries = block count and maps state IDs to blocks.

## Changes

**1. Polymorphic comparison patterns:**
Instead of always `MOV_RI R14, state; CMP R15, R14; JZ`, randomly select:
- **V0 (current):** `MOV_RI scratch, state; CMP state_reg, scratch; JZ target`
- **V1:** `MOV_RI scratch, state; SUB scratch, state_reg; JZ target` (SUB sets ZF if equal)
- **V2:** `MOV_RI scratch, state; XOR scratch, state_reg; JZ target` (XOR sets ZF if equal)
- **V3:** `MOV_RI scratch, state ^ mask; XOR scratch, state_reg; MOV_RI temp, mask; CMP scratch, temp; JZ target` (masked comparison - different size!)

**2. Dummy dispatcher entries:**
Insert 1-3 fake comparisons for non-existent state IDs. These always fail but make the dispatcher appear to have more blocks. Use random state values not assigned to any real block.

**3. Randomize comparison order:**
Current: dispatcher entries are Fisher-Yates shuffled. But the shuffled order is still a simple linear scan. Add a second level: occasionally emit a dispatcher entry as a sub-chain (JMP to a later position, compare there, JMP back).

**4. Obfuscated state IDs:**
Current: `mt19937_64` random values. Additionally, XOR all state IDs with a per-build mask so the raw values in bytecode don't reveal the RNG output sequence.

**5. Randomize state/scratch register assignment:**
Current: hardcoded `R15` (state), `R14` (scratch). Allow config to use any two GP registers.

**Files:** `include/PEcker/obfuscation/cfg_flatten.h`

## Sub-tasks
- [x] Implement 3 alternative comparison patterns (SUB/XOR/masked)
- [x] Add dummy dispatcher entries with fake state IDs
- [x] Randomize comparison entry order with sub-chains
- [x] XOR-mask all state IDs with per-build constant
- [x] Make state_reg and scratch_reg configurable (not hardcoded R15/R14)

