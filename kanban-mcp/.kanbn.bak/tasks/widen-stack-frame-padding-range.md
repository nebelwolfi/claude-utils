---
created: 2026-03-11T16:25:43.291Z
updated: 2026-03-11T16:25:43.291Z
tags:
  - entry-stub
  - anti-pattern-matching
  - anti-ida
---

# Widen Stack Frame Padding Range

**Problem**: `computeStubPadding` generates padding in [0, 4096] bytes (257 values × 16). Total allocation clusters at ~29KB-33KB - still recognizably abnormal and tightly clustered.

**Solution**: Increase padding range from [0, 4096] to [0, 32768] (2049 values × 16). Total stack allocation now ranges ~29KB to ~62KB, overlapping with real-world heavy functions (game engines, signal processing, compilers).

**Key file**: `include/PEcker/stub/entry_stub.h` ~L131 - change `% 257u` to `% 2049u` in `computeStubPadding`.

Trivial one-line change with high impact on clustering heuristics.

## Sub-tasks
- [ ] Change `computeStubPadding` modulus from 257 to 2049
- [ ] Verify existing tests still pass (padding is dead space, no correctness risk)
- [ ] Update `computeStubPadding` docstring to reflect new range

