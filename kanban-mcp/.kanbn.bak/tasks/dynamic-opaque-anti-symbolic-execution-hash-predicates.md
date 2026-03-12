---
created: 2026-02-26T20:21:03.768Z
updated: 2026-03-02T12:35:24.497Z
started: 2026-02-27T20:07:45.117Z
completed: 2026-03-01T04:11:59.098Z
---

# Dynamic Opaque: anti-symbolic-execution hash predicates

Extend dynamic_opaque.h with Category C. FNV-1a hash computation (~50 bytes of VM instructions), compare against precomputed constant, branch on mismatch (never taken). Nested hash predicates: chain N checks creating 2^N paths (configurable depth via opaque_predicate_depth). Mixed MBA+hash predicates for complex constraints.

## Relations

- [requires dynamic-opaque-core-infrastructure-and-contextual-predicates](dynamic-opaque-core-infrastructure-and-contextual-predicates.md)
