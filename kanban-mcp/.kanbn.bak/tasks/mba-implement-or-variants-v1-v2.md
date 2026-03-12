---
created: 2026-03-03T19:54:53.901Z
updated: 2026-03-05T00:17:44.927Z
started: 2026-03-04T21:11:49.861Z
completed: 2026-03-04T21:15:48.801Z
priority: high
tags:
  - mba
  - variants
  - core
---

# MBA: Implement OR variants V1-V2

Implement two new OR expansion variants (all avoid OR opcode):

**V1: `~(~x & ~y)`** - 1 scratch, De Morgan, **minimal**
```
s0 = src; NOT s0          → s0 = ~y
NOT dst                   → dst = ~x
AND dst, s0               → dst = ~x & ~y
NOT dst                   → dst = ~(~x & ~y) = x | y
```

**V2: `(x + y) - (x & y)`** - 2 scratch
```
s0 = dst; s0 += src      → s0 = x+y
s1 = dst; s1 &= src      → s1 = x&y
dst = s0; dst -= s1       → dst = (x+y) - (x&y) = x|y
```

All verified correct for `dst == src` (x|x=x).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement expandOrV1 (NOT + AND + NOT, De Morgan, 1 scratch)
- [x] Implement expandOrV2 (ADD + AND + SUB)

## Relations

- [requires mba-refactor-expand-functions-to-accept-scratch-register-params](mba-refactor-expand-functions-to-accept-scratch-register-params.md)
