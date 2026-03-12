---
created: 2026-02-26T20:20:48.865Z
updated: 2026-03-02T11:52:34.393Z
started: 2026-02-27T20:07:38.634Z
completed: 2026-02-28T21:51:24.748Z
---

# FlowSensitive: unit tests

tests/flow_sensitive_tests.cpp (~35 tests). Primitives: mixChainState determinism, keystream byte generation. Build-time: verify encrypted bytecode differs from plaintext. Runtime: fib/sum programs decrypt correctly across all dispatch modes. Branch handling: conditional/unconditional jumps resolve correct chain_state. Combined: flow-sensitive + junk + mutate. BIN2BIN: all 3 dispatch modes.

## Relations

- [requires flow-sensitive-pipeline-integration](flow-sensitive-pipeline-integration.md)
