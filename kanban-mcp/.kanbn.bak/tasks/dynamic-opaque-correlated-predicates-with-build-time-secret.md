---
created: 2026-02-26T20:21:00.429Z
updated: 2026-03-02T12:27:57.751Z
started: 2026-02-27T20:07:43.203Z
completed: 2026-03-01T04:11:44.160Z
---

# Dynamic Opaque: correlated predicates with build-time secret

Extend dynamic_opaque.h with Category B. Insert prologue saving R13, loading build-time secret S. Each predicate: hash(R13, predicate_index) via XOR/MUL/SHR chain in VM instructions, check bit 0, branch. Both paths merge to same continuation. All predicates correlated - changing seed flips all simultaneously. Insert R13 restoration before HALT/RET.

## Relations

- [requires dynamic-opaque-core-infrastructure-and-contextual-predicates](dynamic-opaque-core-infrastructure-and-contextual-predicates.md)
