---
created: 2026-03-11T16:00:51.339Z
updated: 2026-03-11T16:00:51.339Z
priority: low
tags:
  - mba
  - opaque-predicates
  - junk-insertion
  - composable
  - quick-win
---

# MBA: Opaque Predicates from MBA Primitives

Generate always-true or always-false conditions hidden behind MBA expressions, then use them to insert dead branches with junk code. This composes existing MBA primitives with the existing opaque predicate infrastructure in `dynamic_opaque.h` and `junk_insertion.h`.

**Background**: An opaque predicate is a condition whose outcome is known at build time but hard to determine statically. Current opaque predicates in `dynamic_opaque.h` use techniques like memory-dependent comparisons. MBA offers a new source: mathematical identities that are tautologically true but non-obvious after expansion.

**MBA-derived opaque predicates**:

```
// Always true (∀ x):
x ^ x == 0              → MBA-expand the XOR, compare result to 0
(x | ~x) == ~0           → MBA-expand the OR+NOT, compare to ~0
(x + ~x) == ~0           → MBA-expand the ADD+NOT
(x & ~x) == 0            → MBA-expand the AND+NOT

// Always false (∀ x):
x ^ x != 0              → negate any always-true predicate
(x & ~x) != 0

// Parameterized (∀ x, y):
(x ^ y) ^ (y ^ x) == 0  → commutativity of XOR
(x + y) - y == x         → additive inverse
```

**Implementation approach**:

1. **New generator function** `emitMbaOpaquePredicate(v, rng, always_true)`:
   - Pick a random register `x` (any live register - its value doesn't matter)
   - Pick an identity (e.g., `x ^ x == 0`)
   - MBA-expand the operation(s) using existing `generateMbaSequence()`
   - Emit `VM_CMP result, zero_reg` + conditional branch
   - The true branch continues normal execution; the false branch contains junk

2. **Integration with JunkInsertion pass** (`junk_insertion.h`):
   - Add `MbaOpaquePredicate` as a new junk pattern alongside existing patterns
   - When `use_opaque_predicates` is enabled in `JunkInsertionConfig`, randomly select between existing opaque predicates and MBA-derived ones
   - The dead branch after the opaque predicate gets filled with junk instructions (existing infrastructure)

3. **Integration with DynamicOpaquePass** (`dynamic_opaque.h`):
   - Add MBA predicates as a new predicate source in the predicate generator
   - These are "static" opaque predicates (always true/false regardless of runtime state) vs the existing "dynamic" ones (memory-dependent)

**Advantages over existing opaque predicates**:
- No memory dependency - works in any context, no stack slot needed
- The MBA expansion makes the identity non-obvious to pattern matchers
- Composable: depth-2 MBA on the predicate's inner operations adds another layer
- Different algebraic structure from memory-based predicates - an attacker needs both memory analysis AND algebraic simplification

**Files**: 
- `include/PEcker/obfuscation/mba.h` (new `emitMbaOpaquePredicate` function)
- `include/PEcker/obfuscation/junk_insertion.h` (integration)
- `include/PEcker/obfuscation/dynamic_opaque.h` (integration)

## Sub-tasks
- [ ] Implement `emitMbaOpaquePredicate(v, rng, always_true)` in mba.h: pick random identity, MBA-expand it, emit CMP + conditional branch
- [ ] Add identity pool: at least 4 always-true identities (x^x==0, x|~x==~0, x&~x==0, (x+y)-y==x) with random selection
- [ ] Implement dead branch emission: the unreachable branch after the opaque predicate gets filled with random junk bytecode (reuse junk_insertion patterns)
- [ ] Integrate with JunkInsertionConfig: add `bool use_mba_predicates = false` flag, mix MBA predicates with existing opaque predicate types
- [ ] Integrate with DynamicOpaquePass: add MBA predicates as a new source alongside memory-dependent predicates
- [ ] Ensure MBA predicate scratch registers are properly PUSH/POP saved and restored
- [ ] Tests: verify always-true predicates always take the true branch for random register values
- [ ] Tests: verify always-false predicates always take the false branch
- [ ] Tests: MBA opaque predicates + junk insertion compose correctly - program produces correct output
- [ ] Tests: fib(10) with MBA opaque predicates enabled - correctness check

