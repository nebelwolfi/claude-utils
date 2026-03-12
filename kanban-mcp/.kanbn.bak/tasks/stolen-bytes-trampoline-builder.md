---
created: 2026-02-26T20:22:21.803Z
updated: 2026-03-02T17:30:59.557Z
started: 2026-02-27T20:09:35.279Z
completed: 2026-02-28T01:39:05.961Z
---

# Stolen bytes: trampoline builder

buildStolenBytesTrampoline(): copies stolen instruction bytes with RIP-relative disp32 adjustments (new_disp = old_disp + original_rip - new_rip), appends JMP rel32 back to original_va + steal_length. Returns StolenBytesTrampoline with code vector and jmp_back_fixup offset.

## Relations

- [requires stolen-bytes-analyzer](stolen-bytes-analyzer.md)
