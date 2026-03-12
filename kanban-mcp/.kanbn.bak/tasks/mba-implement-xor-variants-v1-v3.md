---
created: 2026-03-03T19:54:42.088Z
updated: 2026-03-05T00:14:11.005Z
started: 2026-03-04T20:56:05.051Z
completed: 2026-03-04T21:04:23.296Z
priority: high
tags:
  - mba
  - variants
  - core
---

# MBA: Implement XOR variants V1-V3

Implement three new XOR expansion variants (all avoid XOR opcode):

**V1: `(x | y) & ~(x & y)`** - 2 scratch, pure bitwise (no arithmetic!)
```
s0 = dst; s0 |= src      → s0 = x|y
s1 = dst; s1 &= src      → s1 = x&y
NOT s1                    → s1 = ~(x&y)
dst = s0; dst &= s1       → dst = (x|y) & ~(x&y) = x^y
```

**V2: `(x & ~y) | (~x & y)`** - 2 scratch, XOR definition
```
s0 = src; NOT s0          → s0 = ~y
s1 = dst; s1 &= s0       → s1 = x & ~y
s0 = dst; NOT s0          → s0 = ~x
s0 &= src                → s0 = ~x & y
dst = s1; dst |= s0       → dst = (x & ~y) | (~x & y) = x^y
```

**V3: `(x | y) & (~x | ~y)`** - 2 scratch, pure bitwise
```
s0 = dst; s0 |= src      → s0 = x|y
s1 = src; NOT s1          → s1 = ~y
NOT dst                   → dst = ~x
dst |= s1                 → dst = ~x | ~y
dst &= s0                 → dst = (x|y) & (~x|~y) = x^y
```

All verified correct for `dst == src` (x^x=0).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement expandXorV1 (OR + AND + NOT + AND, pure bitwise)
- [x] Implement expandXorV2 (NOT + AND + NOT + AND + OR)
- [x] Implement expandXorV3 (OR + NOT + OR + AND, pure bitwise)

## Relations

- [requires mba-refactor-expand-functions-to-accept-scratch-register-params](mba-refactor-expand-functions-to-accept-scratch-register-params.md)
