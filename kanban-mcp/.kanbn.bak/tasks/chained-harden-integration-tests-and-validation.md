---
created: 2026-02-26T20:58:54.175Z
updated: 2026-03-03T00:35:31.471Z
started: 2026-02-28T00:08:34.869Z
completed: 2026-03-01T04:27:02.155Z
---

# Chained harden: integration tests and validation

End-to-end validation of all chained dispatch hardening improvements working together. BIN2BIN_TEST corpus run with chained mode + all hardening flags (poly-dispatch, decoy-handlers, inline-flags, encrypt-dispatch-table). Binary diff: protect same binary twice with different seeds, verify .pecker sections differ in handler layouts, epilogue patterns, and table contents. Verify all existing chained_tests.cpp tests still pass. Verify no performance regression beyond 5% on benchmark corpus. ~100 lines in chained_tests.cpp.

## Sub-tasks

- [x] Add test: all hardening flags enabled simultaneously, BIN2BIN corpus passes
- [x] Add test: binary diff with different seeds shows different epilogue bytes
- [x] Add test: binary diff shows different decoy placement
- [x] Add test: encrypted dispatch table differs from plaintext across seeds
- [x] Benchmark: compare dispatch latency with/without hardening on benchmark corpus

## Relations

- [requires chained-harden-polymorphic-dispatch-epilogue](chained-harden-polymorphic-dispatch-epilogue.md)
- [requires chained-harden-executable-decoy-handlers](chained-harden-executable-decoy-handlers.md)
- [requires chained-harden-inline-flag-computation](chained-harden-inline-flag-computation.md)
- [requires chained-harden-dispatch-table-encryption](chained-harden-dispatch-table-encryption.md)
