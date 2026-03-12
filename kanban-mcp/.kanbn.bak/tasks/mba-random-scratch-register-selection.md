---
created: 2026-03-03T19:55:02.370Z
updated: 2026-03-05T00:04:19.980Z
started: 2026-03-03T21:02:24.533Z
completed: 2026-03-05T00:03:46.346Z
priority: high
tags:
  - mba
  - scratch-regs
  - core
---

# MBA: Random scratch register selection

Replace hardcoded R14/R15 scratch registers with randomly selected ones.

**Add `pickScratchRegs` function:**
```cpp
static inline void pickScratchRegs(std::mt19937& rng, RegId dst, RegId src,
                                    RegId& s0, RegId& s1) {
    // Build candidate pool: R0-R15 excluding dst and src
    RegId candidates[16];
    u8 count = 0;
    for (u8 r = 0; r <= 15; ++r) {
        RegId rid = static_cast<RegId>(r);
        if (rid != dst && rid != src)
            candidates[count++] = rid;
    }
    // Fisher-Yates partial shuffle for 2 picks
    std::uniform_int_distribution<u8> dist0(0, count - 1);
    u8 i0 = dist0(rng);
    s0 = candidates[i0];
    candidates[i0] = candidates[count - 1];
    --count;
    std::uniform_int_distribution<u8> dist1(0, count - 1);
    s1 = candidates[dist1(rng)];
}
```

**Remove the R14/R15 exclusion check** in `applyOnce` (lines 302-304):
```cpp
// DELETE THESE LINES:
if (dst == RegId::R14 || dst == RegId::R15 ||
    src == RegId::R14 || src == RegId::R15)
    continue;
```

Now ALL ALU instructions are eligible for MBA transformation.

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement pickScratchRegs with Fisher-Yates
- [x] Remove R14/R15 exclusion check from applyOnce
- [x] Update generateMbaSequence to call pickScratchRegs
