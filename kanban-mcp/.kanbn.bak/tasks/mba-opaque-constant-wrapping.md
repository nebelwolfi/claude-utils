---
created: 2026-03-03T20:07:15.503Z
updated: 2026-03-05T01:46:00.282Z
started: 2026-03-05T01:13:47.063Z
completed: 2026-03-05T01:44:55.396Z
tags:
  - mba
  - opaque-constants
  - core
  - hardening
---

# MBA: Opaque constant wrapping

Wrap MBA expansions with a pre-add/post-subtract of a random constant C, where C is computed via different expressions each time.

## Approach

Before the MBA expansion, add a random constant to dst:
```
// Pre-wrap: dst += C (computed as A ^ B where A,B are random and A^B = C)
MOV_RI s_temp, A
MOV_RI s_temp2, B
XOR s_temp, s_temp2        // s_temp = C
ADD dst, s_temp            // dst = x + C
```

After the MBA expansion (which now computes `(x+C) OP y`), subtract C to correct:
```
// Post-wrap: dst -= C (computed as D & E where D,E are different randoms but D&E = C)
MOV_RI s_temp, D
MOV_RI s_temp2, E
AND s_temp, s_temp2        // s_temp = C (via different expression!)
SUB dst, s_temp            // dst = result - C
```

## Key insight

The +C and -C use DIFFERENT computation methods:
- Pre-wrap: C = A ^ B (XOR of two randoms)
- Post-wrap: C = D & E (AND of two different randoms)

An analyzer must prove `A ^ B == D & E` to realize the constants cancel. Each pair (A,B) and (D,E) is chosen such that the result equals C.

## Generation of constant pairs

Given random C:
- For XOR: A = random, B = A ^ C
- For AND: D = C | random_high_bits, E = C | random_other_high_bits (ensure D & E = C)
  - Specifically: D = C | mask1, E = C | mask2, where mask1 & mask2 = 0 (disjoint masks for bits NOT in C)
- For OR: F = C & random_subset, G = C & complement_subset (ensure F | G = C)
- For ADD: H = random, I = C - H

Randomly select which computation method to use for pre and post (different methods each time).

## Applicability

Only for ADD and SUB where constant pre-addition/subtraction is algebraically clean:
- ADD: `(x+C) + y - C = x + y` ✓
- SUB: `(x+C) - y - C = x - y` ✓

For bitwise ops it doesn't work directly: `(x+C) ^ y ≠ (x^y) + C` in general.
For bitwise ops, use a different wrapping: `(x ^ C) OP (y ^ C)` and post-correct.
- XOR: `(x^C) ^ (y^C) = x ^ y` ✓ (C cancels)
- AND: `(x^C) & (y^C) ≠ x & y` ✗ - doesn't work.

So opaque wrapping applies cleanly to ADD, SUB, and XOR only. For AND/OR, skip wrapping.

## Config

Add `bool opaque_wrapping = false;` to MbaConfig. When enabled, wrap ADD/SUB/XOR expansions with probability based on density.

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement constant pair generation (XOR, AND, OR, ADD methods)
- [x] Implement pre-wrap emission (add C via method A)
- [x] Implement post-wrap emission (subtract C via method B, different computation)
- [x] Wire wrapping into generateMbaSequence for ADD/SUB/XOR
- [x] Add opaque_wrapping config field

## Relations

- [[]([.md)
