---
created: 2026-03-03T19:54:35.219Z
updated: 2026-03-05T00:12:03.842Z
started: 2026-03-04T20:47:56.150Z
completed: 2026-03-04T20:54:49.956Z
priority: high
tags:
  - mba
  - variants
  - core
---

# MBA: Implement SUB variants V1-V3

Implement three new SUB expansion variants:

**V1: `~(~x + y)`** - 1 scratch reg, **avoids SUB entirely**
```
s0 = src                  → s0 = y (backup)
NOT dst                   → dst = ~x
ADD dst, s0               → dst = ~x + y
NOT dst                   → dst = ~(~x + y) = x-y
```

**V2: `(x & ~y) - (~x & y)`** - 2 scratch regs
```
s0 = src; NOT s0          → s0 = ~y
s1 = dst; s1 &= s0       → s1 = x & ~y
s0 = dst; NOT s0          → s0 = ~x
s0 &= src                → s0 = ~x & y
dst = s1; dst -= s0       → dst = (x & ~y) - (~x & y) = x-y
```

**V3: `2*(x & ~y) - (x ^ y)`** - 2 scratch regs
```
s0 = src; NOT s0          → s0 = ~y
s1 = dst; s1 &= s0       → s1 = x & ~y
s1 += s1                  → s1 = 2*(x & ~y)
s0 = dst; s0 ^= src      → s0 = x ^ y
dst = s1; dst -= s0       → dst = 2*(x & ~y) - (x ^ y) = x-y
```

All verified correct for `dst == src` case (x-x=0).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement expandSubV1 (NOT + ADD + NOT, 1 scratch)
- [x] Implement expandSubV2 (AND + NOT + AND + SUB)
- [x] Implement expandSubV3 (NOT + AND + ADD-self + XOR + SUB)

## Relations

- [requires mba-refactor-expand-functions-to-accept-scratch-register-params](mba-refactor-expand-functions-to-accept-scratch-register-params.md)
