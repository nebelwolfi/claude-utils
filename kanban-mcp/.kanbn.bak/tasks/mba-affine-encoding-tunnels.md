---
created: 2026-03-11T15:48:46.749Z
updated: 2026-03-11T15:48:46.749Z
priority: high
tags:
  - mba
  - affine-encoding
  - hardening
  - anti-trace
  - tigress-style
---

# MBA: Affine Encoding Tunnels

Implement affine encoding tunnels that keep register values in an encoded form `e(x) = a*x + b` across multiple instructions, only decoding when required (memory stores, native calls, comparisons). This is a fundamentally different defense layer from truth-table MBA - instead of obfuscating individual operations, it obfuscates the *data flow* between operations.

**Background**: Used by Tigress and described by Drape et al. ("Specifying Imperative Data Obfuscations"). The key insight: if you encode values with an invertible affine function `e(x) = a*x + b` (where `a` is odd, guaranteeing invertibility mod 2^64, with inverse `a⁻¹` computed via extended Euclidean algorithm), then arithmetic on encoded values can be rewritten:

```
Encoded ADD:  e(x) + e(y) = a*x + b + a*y + b = a*(x+y) + 2b
              Need result as e(x+y) = a*(x+y) + b
              So: encoded_add(e(x), e(y)) = e(x) + e(y) - b

Encoded SUB:  e(x) - e(y) = a*x + b - a*y - b = a*(x-y)
              Need result as e(x-y) = a*(x-y) + b
              So: encoded_sub(e(x), e(y)) = e(x) - e(y) + b

Encoded MUL:  e(x) * e(y) doesn't simplify cleanly for affine encoding.
              Must decode, multiply, re-encode.

Encoded XOR:  e(x) ^ e(y) doesn't preserve affine structure.
              Must decode, XOR, re-encode.
```

**Key properties**:
- ADD/SUB on encoded values only need a constant correction (±b), not full decode/re-encode
- Bitwise ops (XOR/AND/OR) and MUL require decode→operate→re-encode at operation boundaries
- The "tunnel" is the region between encode and decode points - an attacker tracing values within a tunnel sees only encoded (scrambled) values
- Different registers can use different (a, b) pairs, so correlating values across registers requires solving a system of affine equations

**Implementation as an MBA variant**:

This is a new obfuscation pass (not a variant within the existing MBA dispatch) because it operates on instruction *sequences*, not individual instructions. However, it composes naturally with MBA:

1. **Tunnel identification**: Scan bytecode for straight-line sequences of ADD/SUB instructions on the same register (the "tunnel-friendly" region). Mark tunnel entry/exit points.

2. **Encoding**: At tunnel entry, replace `dst` with `e(dst) = a*dst + b`:
   ```
   PUSH scratch
   MOV_RI scratch, a
   MUL dst, scratch        // dst = a * dst
   MOV_RI scratch, b
   ADD dst, scratch         // dst = a*dst + b = e(dst)
   POP scratch
   ```

3. **Rewrite inner operations**: For each ADD/SUB within the tunnel, apply the correction:
   - `ADD dst, src` → encode src first (`e(src) = a*src + b`), then `ADD dst, e(src); SUB dst, b_correction`
   - Or simpler: decode both, ADD, re-encode (less efficient but always correct)

4. **Decoding**: At tunnel exit (before memory store, native call, branch comparison):
   ```
   PUSH scratch
   MOV_RI scratch, b
   SUB dst, scratch         // dst = a*dst
   MOV_RI scratch, a_inv
   MUL dst, scratch          // dst = a_inv * a * dst_orig = dst_orig
   POP scratch
   ```

5. **MBA composition**: The encode/decode sequences contain ADD/SUB/MUL instructions that can themselves be MBA-expanded on a subsequent depth pass, hiding the affine structure.

**Affine inverse computation**: `a` must be odd (for invertibility mod 2^64). Compute `a⁻¹` at build time using the extended Euclidean algorithm or the identity: for odd `a`, `a⁻¹ = a * (2 - a*a) * (2 - a*a*a*a) * ...` (Newton's method converges in 6 iterations for 64-bit).

**Scope**: Start with ADD/SUB-only tunnels (where corrections are simple constants). XOR/AND/OR tunnels require full decode/re-encode at each operation boundary, which is more expensive but still viable.

**File**: New pass `include/PEcker/obfuscation/affine_encoding.h`, or integrated into `mba.h` as a pre/post-processing step.

## Sub-tasks
- [ ] Implement modular inverse for odd 64-bit integers: `u64 modInverse(u64 a)` using Newton iteration (6 steps for 64-bit convergence)
- [ ] Implement `emitAffineEncode(v, dst, a, b, scratch)` - encode dst as a*dst + b
- [ ] Implement `emitAffineDecode(v, dst, a_inv, b, scratch)` - decode dst as a_inv*(dst - b)
- [ ] Tunnel identification: scan bytecode for straight-line ADD/SUB sequences on same register, mark tunnel entry/exit
- [ ] Implement ADD/SUB correction within tunnels: `encoded_add = e(x) + e(y) - b`, `encoded_sub = e(x) - e(y) + b`
- [ ] Handle tunnel exit points: insert decode before VM_MOV_MR (memory store), VM_NATIVE_CALL, VM_CMP, VM_TEST, branch targets
- [ ] Handle tunnel entry points: insert encode after VM_MOV_RM (memory load), VM_MOV_RI (immediate load), function entry
- [ ] Per-register (a, b) diversity: different registers use different affine parameters within the same tunnel
- [ ] Create AffineEncodingConfig: tunnel_min_length (minimum instructions to justify encode/decode overhead), density, seed
- [ ] Config plumbing: PeckerConfig, args.h (--affine-encoding), pipeline.h (run before or after MBA), cmd_protect.h
- [ ] Pipeline ordering: affine encoding should run BEFORE MBA so that encode/decode operations get MBA-expanded on subsequent passes
- [ ] Tests: encode/decode round-trip correctness for random values and random (a, b) pairs
- [ ] Tests: tunnel with ADD/SUB sequences produces correct final result after decode
- [ ] Tests: fib(10) and sum(1..10) with affine encoding enabled
- [ ] Tests: affine + MBA composition (depth 2 MBA-expands the encode/decode instructions)

