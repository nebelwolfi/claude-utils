---
created: 2026-02-26T20:22:07.508Z
updated: 2026-03-02T17:14:32.504Z
started: 2026-02-27T20:09:09.818Z
completed: 2026-03-01T04:35:31.494Z
---

# Anti-decompile: handler blob padding with fake code

Replace random padding bytes between handlers with structured fake code: fake prologues, dead handler mimics, overlapping instruction traps. Increase padding range to 0-256 bytes.

## Relations

- [requires anti-decompile-gadget-code-generation-library](anti-decompile-gadget-code-generation-library.md)
