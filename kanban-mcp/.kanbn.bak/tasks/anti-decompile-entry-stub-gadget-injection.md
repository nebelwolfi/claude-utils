---
created: 2026-02-26T20:22:05.380Z
updated: 2026-03-02T17:36:08.419Z
started: 2026-02-27T20:09:07.781Z
completed: 2026-02-28T01:28:51.100Z
---

# Anti-decompile: entry stub gadget injection

Modify generateEntryStub()/generateChainedEntryStub(). 3 injection points AFTER prolog_size: (1) after zero-init, (2) replace CALL RAX with opaque indirect, (3) fake prologue before epilogue. Cumulative offset tracking for all fixup fields.

## Relations

- [requires anti-decompile-gadget-code-generation-library](anti-decompile-gadget-code-generation-library.md)
