---
created: 2026-03-03T20:06:58.383Z
updated: 2026-03-05T01:13:28.482Z
started: 2026-03-05T00:38:54.839Z
completed: 2026-03-05T01:12:53.610Z
tags:
  - mba
  - splitting
  - core
  - hardening
---

# MBA: Expression splitting (32-bit halves)

Split 64-bit values into upper and lower 32-bit halves, apply different MBA variants to each half independently, then recombine.

## Approach

For bitwise ops (XOR, AND, OR) - straightforward, no carry:
```
x_lo = x & 0xFFFFFFFF
x_hi = x >> 32
y_lo = y & 0xFFFFFFFF
y_hi = y >> 32
result_lo = x_lo OP y_lo    // apply MBA variant A
result_hi = x_hi OP y_hi    // apply MBA variant B (different!)
result = (result_hi << 32) | result_lo
```

For ADD - must handle carry from lower to upper half:
```
x_lo = x & 0xFFFFFFFF
x_hi = x >> 32
y_lo = y & 0xFFFFFFFF
y_hi = y >> 32
sum_lo = x_lo + y_lo
carry = sum_lo >> 32         // carry bit
result_lo = sum_lo & 0xFFFFFFFF
result_hi = x_hi + y_hi + carry
result = (result_hi << 32) | result_lo
```

For SUB - must handle borrow:
```
x_lo = x & 0xFFFFFFFF
y_lo = y & 0xFFFFFFFF
diff_lo = x_lo - y_lo
borrow = (diff_lo >> 63) & 1   // borrow if x_lo < y_lo (unsigned)
result_lo = diff_lo & 0xFFFFFFFF
result_hi = x_hi - y_hi - borrow
result = (result_hi << 32) | result_lo
```

## Key benefit

Each half gets a DIFFERENT randomly-selected MBA variant. An analyzer who cracks the upper-half obfuscation still has to separately crack the lower half with a different structure. The split itself is also non-obvious in the bytecode.

## Scratch registers

Needs 3 scratch registers: s0 = x_hi (or saved x), s1 = y_hi (or saved y), s2 = temp.
Uses MOV_RI for masks (0xFFFFFFFF), SHR for >> 32, SHL for << 32, OR for recombine.

## Variant integration

Add as a "meta-variant" V5 that wraps the existing variants. When selected, it splits into halves and calls two inner variants (randomly chosen) for each half.

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement 32-bit split/recombine helpers (mask, shift, OR)
- [x] Implement split variant for XOR/AND/OR (no carry)
- [x] Implement split variant for ADD (with carry propagation)
- [x] Implement split variant for SUB (with borrow propagation)
- [x] Wire split variants into variant selection dispatch

## Relations

- [[]([.md)
