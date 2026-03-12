---
created: 2026-03-03T19:55:08.634Z
updated: 2026-03-03T22:37:21.994Z
started: 2026-03-03T22:17:26.176Z
completed: 2026-03-03T22:36:43.870Z
priority: high
tags:
  - mba
  - dispatch
  - core
---

# MBA: Variant selection dispatch + generateMbaSequence rewrite

Rewrite `generateMbaSequence` to:
1. Accept `std::mt19937& rng` parameter
2. Pick a random variant for the given opcode (4 variants for ADD/SUB/XOR/AND, 3 for OR)
3. Pick random scratch registers via `pickScratchRegs`
4. Determine if variant needs 1 or 2 scratch regs
5. Emit PUSH/POP only for needed scratch regs
6. Dispatch to the correct `expandXxxVN` function

Add `needsTwoScratch(Opcode, u32 variant)` helper that returns false for:
- ADD V3, SUB V1, AND V1, OR V1 (all 1-scratch variants)

**New signature:**
```cpp
void generateMbaSequence(std::vector<u8>& v, Opcode op, RegId dst, RegId src,
                         std::mt19937& rng)
```

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Add needsTwoScratch helper
- [x] Rewrite generateMbaSequence with variant selection
- [x] Update applyOnce to pass rng to generateMbaSequence

## Relations

- [requires mba-implement-add-variants-v1-v3](mba-implement-add-variants-v1-v3.md)
- [requires mba-implement-sub-variants-v1-v3](mba-implement-sub-variants-v1-v3.md)
- [requires mba-implement-xor-variants-v1-v3](mba-implement-xor-variants-v1-v3.md)
- [requires mba-implement-and-variants-v1-v3](mba-implement-and-variants-v1-v3.md)
- [requires mba-implement-or-variants-v1-v2](mba-implement-or-variants-v1-v2.md)
- [requires mba-random-scratch-register-selection](mba-random-scratch-register-selection.md)
