---
created: 2026-02-26T20:22:29.426Z
updated: 2026-03-02T03:35:57.078Z
started: 2026-02-27T20:09:50.272Z
completed: 2026-02-28T02:00:17.257Z
---

# Stolen bytes: unit tests

tests/stolen_bytes_tests.cpp. Analyzer: simple prologue, frameless prologue, RIP-relative, max_steal, feasibility. Trampoline: size, JMP back target, RIP fixups. Integration: stolen+inline stub, stolen+JMP trampoline via MinimalPe64. CLI flag parsing.

## Relations

- [requires stolen-bytes-pipeline-integration](stolen-bytes-pipeline-integration.md)
