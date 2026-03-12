---
created: 2026-02-26T20:21:08.705Z
updated: 2026-03-03T00:49:23.194Z
started: 2026-02-27T20:07:49.320Z
completed: 2026-03-01T04:10:24.470Z
---

# Dynamic Opaque: comprehensive test suite

~20 tests in tests/obfuscation_tests.cpp. Contextual correctness (3 generators), correlated consistency (seed flip test), hash correctness (depth 1/3/5), integration with junk/mba/flatten/full pipeline, size growth analysis, seed sensitivity, edge cases.

## Relations

- [requires dynamic-opaque-correlated-predicates-with-build-time-secret](dynamic-opaque-correlated-predicates-with-build-time-secret.md)
- [requires dynamic-opaque-anti-symbolic-execution-hash-predicates](dynamic-opaque-anti-symbolic-execution-hash-predicates.md)
- [requires dynamic-opaque-cli-integration-and-pipeline-wiring](dynamic-opaque-cli-integration-and-pipeline-wiring.md)
