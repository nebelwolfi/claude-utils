---
created: 2026-03-03T19:54:28.774Z
updated: 2026-03-05T00:10:36.349Z
started: 2026-03-04T20:36:33.651Z
completed: 2026-03-04T20:46:20.090Z
priority: high
tags:
  - mba
  - variants
  - core
---

# MBA: Implement ADD variants V1-V3

Implement three new ADD expansion variants:

**V1: `(x | y) + (x & y)`** - 2 scratch regs
```
s0 = dst; s0 |= src      → s0 = x|y
s1 = dst; s1 &= src      → s1 = x&y
dst = s0; dst += s1       → dst = (x|y) + (x&y) = x+y
```

**V2: `2*(x | y) - (x ^ y)`** - 2 scratch regs, **avoids ADD entirely**
```
s0 = dst; s0 |= src      → s0 = x|y
s0 += s0                  → s0 = 2*(x|y)
s1 = dst; s1 ^= src      → s1 = x^y
dst = s0; dst -= s1       → dst = 2*(x|y) - (x^y) = x+y
```

**V3: `~(~x - y)`** - 1 scratch reg, **avoids ADD entirely**, minimal
```
s0 = src                  → s0 = y (backup, needed when dst==src)
NOT dst                   → dst = ~x
SUB dst, s0               → dst = ~x - y
NOT dst                   → dst = ~(~x - y) = x+y
```

All verified correct for `dst == src` case (x+x=2x).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement expandAddV1 (OR + AND + ADD)
- [x] Implement expandAddV2 (OR + ADD-self + XOR + SUB)
- [x] Implement expandAddV3 (NOT + SUB + NOT, 1 scratch)

## Relations

- [requires mba-refactor-expand-functions-to-accept-scratch-register-params](mba-refactor-expand-functions-to-accept-scratch-register-params.md)
