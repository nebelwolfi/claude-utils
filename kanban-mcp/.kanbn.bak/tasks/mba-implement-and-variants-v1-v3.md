---
created: 2026-03-03T19:54:50.397Z
updated: 2026-03-05T00:15:57.115Z
started: 2026-03-04T21:05:36.532Z
completed: 2026-03-04T21:11:01.912Z
priority: high
tags:
  - mba
  - variants
  - core
---

# MBA: Implement AND variants V1-V3

Implement three new AND expansion variants (all avoid AND opcode):

**V1: `~(~x | ~y)`** - 1 scratch, De Morgan, **minimal**
```
s0 = src; NOT s0          → s0 = ~y
NOT dst                   → dst = ~x
OR dst, s0                → dst = ~x | ~y
NOT dst                   → dst = ~(~x | ~y) = x & y
```

**V2: `(x | y) - (x ^ y)`** - 2 scratch
```
s0 = dst; s0 |= src      → s0 = x|y
s1 = dst; s1 ^= src      → s1 = x^y
dst = s0; dst -= s1       → dst = (x|y) - (x^y) = x&y
```

**V3: `(x | y) ^ (x ^ y)`** - 2 scratch, pure bitwise
```
s0 = dst; s0 |= src      → s0 = x|y
s1 = dst; s1 ^= src      → s1 = x^y
dst = s0; dst ^= s1       → dst = (x|y) ^ (x^y) = x&y
```

All verified correct for `dst == src` (x&x=x).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement expandAndV1 (NOT + OR + NOT, De Morgan, 1 scratch)
- [x] Implement expandAndV2 (OR + XOR + SUB)
- [x] Implement expandAndV3 (OR + XOR + XOR, pure bitwise)

## Relations

- [requires mba-refactor-expand-functions-to-accept-scratch-register-params](mba-refactor-expand-functions-to-accept-scratch-register-params.md)
