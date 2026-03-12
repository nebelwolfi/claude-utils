---
created: 2026-02-26T20:20:56.393Z
updated: 2026-03-02T12:17:43.618Z
started: 2026-02-27T20:07:41.475Z
completed: 2026-03-01T04:03:10.065Z
---

# Dynamic Opaque: core infrastructure and contextual predicates

Create include/PEcker/obfuscation/dynamic_opaque.h with DynamicOpaquePass. DynamicOpaqueConfig: density, seed, predicate_types. Implement 3 contextual predicate generators: even-product n*(n+1), square-nonneg x^2, xor-identity x^x==0. Standard scan/generate/rebuild/fixup pattern. Uses R14/R15 scratch with PUSH/POP save/restore.
