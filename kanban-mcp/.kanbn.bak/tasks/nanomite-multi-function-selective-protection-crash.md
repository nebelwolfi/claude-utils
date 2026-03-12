---
created: 2026-03-11T22:54:11.455Z
updated: 2026-03-12T10:23:19.652Z
started: 2026-03-12T00:46:01.647Z
completed: 2026-03-12T01:07:59.065Z
tags:
  - bug
  - nanomite
  - selective-protection
  - multi-function
---

# Nanomite + multi-function selective protection crash

When `main` is protected with nanomite pass enabled (default density 0.3), the binary crashes or times out. Affects `selective_golden_arithmetic_gcd_and_main` (switch/computed_goto/threaded - all 3 fail with exit 0x100000).

Root cause: nanomite exception handler doesn't work correctly when the calling function (`main`) is itself virtualized. The nested VM invocation (main VM → gcd entry stub → gcd VM) likely breaks the nanomite INT3 exception dispatch chain. Nanomite with single-function protection works fine.
