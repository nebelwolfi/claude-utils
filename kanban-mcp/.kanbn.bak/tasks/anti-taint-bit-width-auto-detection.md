---
created: 2026-02-26T20:21:48.066Z
updated: 2026-03-02T17:28:24.752Z
started: 2026-02-27T20:08:48.481Z
completed: 2026-03-01T07:18:07.938Z
---

# AntiTaint: bit-width auto-detection

Lightweight backward analysis to infer operand widths from preceding MOV_RM8/16/32 instructions. 8-bit AND preceded by MOV_RM8 uses 8-iteration loop (not 64). Critical for performance. Stop scan at branch boundaries. Cache results.

## Relations

- [requires anti-taint-unit-test-suite](anti-taint-unit-test-suite.md)
