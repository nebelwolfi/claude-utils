---
created: 2026-03-03T20:07:34.421Z
updated: 2026-03-05T02:00:26.633Z
started: 2026-03-05T01:46:13.380Z
completed: 2026-03-05T01:59:46.589Z
tags:
  - mba
  - expanded-targets
  - core
  - hardening
---

# MBA: Expand targetable opcodes (MOV_RR, NOT)

Extend MBA to also transform MOV_RR and NOT instructions, increasing the surface area of obfuscation.

## MOV_RR (dst = src)

`dst = src` is equivalent to `dst = src ^ 0` or `dst = src | 0` or `dst = src & ~0`.

Transformation options (randomly selected):
1. **XOR with zero:** Compute 0 via MBA (`A ^ A` for random register A), then `dst = src ^ 0`
   ```
   PUSH s0
   MOV_RR s0, <random_reg>
   XOR s0, <random_reg>      // s0 = 0
   MOV_RR dst, src
   XOR dst, s0               // dst = src ^ 0 = src
   POP s0
   ```

2. **AND with all-ones:** Compute ~0 via MBA, then `dst = src & ~0`
   ```
   PUSH s0
   MOV_RR s0, <random_reg>
   OR s0, <random_reg>       // s0 = R|R = R (not ~0!)
   ```
   Hmm, we need ~0. Use: `NOT(0)` or `MOV_RI s0, ~0` (but that reveals the constant).
   Better: `s0 = R; s1 = R; NOT s1; OR s0, s1  → s0 = R | ~R = ~0`
   ```
   PUSH s0, s1
   MOV_RR s0, <random_reg>
   MOV_RR s1, s0
   NOT s1                    // s1 = ~R
   OR s0, s1                 // s0 = R | ~R = ~0
   MOV_RR dst, src
   AND dst, s0               // dst = src & ~0 = src
   POP s1, s0
   ```

3. **Identity via ADD/SUB:** `dst = src + K - K` for random K
   ```
   MOV_RR dst, src
   MOV_RI s0, K
   ADD dst, s0
   SUB dst, s0               // dst = src + K - K = src
   ```

## NOT (dst = ~dst)

`~x` can be rewritten as:
1. **XOR with all-ones:** `dst = dst ^ ~0` (where ~0 is computed opaquely as above)
2. **Two's complement:** `dst = 0 - dst - 1` i.e. `dst = (-1) - dst` i.e. `dst = ~0 - dst`
   ```
   PUSH s0
   s0 = <random_reg>
   NOT s0; OR s0, s0  → or just compute ~0 as R | ~R
   SUB s0, dst         // s0 = ~0 - dst = ~dst
   MOV_RR dst, s0
   POP s0
   ```
3. **Via MBA sub-expression:** `~x = (x ^ ~0)` → apply XOR MBA variant with src = computed ~0

## Config

Add MOV_RR and NOT to `isMbaTarget()`:
```cpp
static inline bool isMbaTarget(Opcode op) {
    return op == Opcode::VM_ADD || op == Opcode::VM_SUB ||
           op == Opcode::VM_XOR || op == Opcode::VM_AND ||
           op == Opcode::VM_OR  || op == Opcode::VM_MOV_RR ||
           op == Opcode::VM_NOT;
}
```

Note: MOV_RR is 3 bytes (opcode + dst + src), NOT is 2 bytes (opcode + dst). The `applyOnce` instruction scanning already handles these sizes via `instrSize()`.

For NOT, there's no `src` register - the pass must handle the single-operand case specially (use dst as both operands, or generate a ~0 constant).

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Implement MOV_RR obfuscation variants (3 options)
- [x] Implement NOT obfuscation variants (3 options)
- [x] Update isMbaTarget to include MOV_RR and NOT
- [x] Update applyOnce to handle 2-byte NOT (single operand) specially
- [x] Handle instruction size differences in replacement generation

## Relations

- [[]([.md)
