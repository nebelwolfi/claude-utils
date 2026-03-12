---
created: 2026-03-11T15:48:07.495Z
updated: 2026-03-12T10:51:25.073Z
started: 2026-03-12T10:45:29.589Z
priority: high
tags:
  - mba
  - polynomial
  - non-linear
  - hardening
  - anti-simplification
---

# MBA: Polynomial (Non-Linear) Expressions

Add polynomial (non-linear) MBA expressions that use terms like `x*y`, `x²`, `x²*y` in addition to the current linear bitwise basis. Non-linear MBA is fundamentally harder for automated simplifiers because linear algebra solvers (which solve the current truth-table MBA in O(N³)) cannot handle polynomial terms - they require Gröbner basis computation or SAT/SMT solving.

**Background**: The current MBA is strictly linear: `f(x,y) = sum(a[i] * basis_i(x,y))` where basis terms are purely bitwise (AND, OR, NOT combinations). Tools like SiMBA and MBA-Blast solve these by treating them as linear systems. Polynomial MBA mixes arithmetic multiplication with bitwise operations, breaking linearity.

**Academic foundation**: Biondi et al. "Reconstructing Mixed Boolean-Arithmetic Expressions" and Zhou et al. describe polynomial MBA generation. The key insight: `x * y` is not a linear function of the bitwise basis - it involves carry propagation across all 64 bits, making it algebraically opaque to linear simplifiers.

**Polynomial identities for target operations**:

1. **XOR**: `x ^ y = (x + y) - 2*(x & y)` - this is already an identity PEcker uses. The polynomial form: `x ^ y = (x + y) - 2*x*y` is WRONG for integers (only true for single bits). But we can use: `x ^ y = x + y - 2*(x & y)` and then replace `(x & y)` with a polynomial approximation modulo 2^64.

2. **Safer polynomial approach**: Use mixed expressions that combine bitwise and arithmetic terms:
   - `x + y = (x ^ y) + 2*(x & y)` - replace the AND with: `(x & y) = (x * y) mod 2` for single bits, but for 64-bit we need: `x & y` cannot be directly expressed as a polynomial of x,y over integers.

3. **Practical polynomial MBA**: Instead of replacing bitwise ops with polynomials (which is mathematically constrained), use polynomial *noise terms* that cancel:
   - `f(x,y) = linear_MBA(x,y) + P(x,y) - P(x,y)` where `P(x,y) = a*x*y + b*x² + c*y²`
   - Each `P(x,y)` and `-P(x,y)` is expressed differently (one as `a*x*y + b*x² + c*y²`, the other as `(a*x+c*y)*y + b*x*x`)
   - The cancellation is algebraically exact but structurally hidden

4. **Modular polynomial rewriting**: For operations modulo 2^64, certain polynomial identities hold:
   - `x * (x - 1) ≡ 0 (mod 2)` for all x (product of consecutive integers is even)
   - Insert `k * x * (x-1)` as noise (always even, so `>> 1` gives integer)
   - More complex: `x^2 ≡ x (mod 2)` for single bits; extend to multi-bit via bitslicing

**Recommended implementation** (polynomial noise injection):
- Keep existing linear MBA as the core computation
- Before and after the linear expansion, inject polynomial noise terms that provably cancel
- Polynomial noise: `P(x,y) = c₁*x*y + c₂*x² + c₃*y²` with random coefficients c₁,c₂,c₃
- Emit `dst += P(x,y)` before MBA, emit `dst -= P(x,y)` after MBA (using different algebraic forms)
- Total: 2 polynomial evaluations (~15-20 instructions each) + linear MBA (~40-80 instructions)

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Research and validate polynomial identities modulo 2^64: verify cancellation properties for noise terms P(x,y) = c₁*x*y + c₂*x² + c₃*y²
- [ ] Implement `emitPolynomialNoise(v, dst, x, y, c1, c2, c3, scratch, rng)` - compute and add polynomial P(x,y) to accumulator
- [ ] Implement `emitPolynomialNoiseCancel(v, dst, x, y, c1, c2, c3, scratch, rng)` - subtract P(x,y) using algebraically different form
- [ ] Integrate into `generateMbaSequence()`: inject polynomial noise before/after linear MBA when enabled
- [ ] Add `polynomial_noise` bool to MbaConfig (default false)
- [ ] Ensure polynomial form 1 and form 2 are structurally different but algebraically equal (e.g., `a*x*y + b*x²` vs `x*(a*y + b*x)`)
- [ ] Config plumbing: MbaConfig, PeckerConfig, args.h (--mba-polynomial), pipeline.h, cmd_protect.h
- [ ] Tests: correctness for all 5 ops with polynomial noise enabled, 100 seeds each
- [ ] Tests: verify polynomial noise terms actually cancel (result matches non-polynomial MBA)
- [ ] Tests: verify bytecode is larger with polynomial noise (structural difference check)

