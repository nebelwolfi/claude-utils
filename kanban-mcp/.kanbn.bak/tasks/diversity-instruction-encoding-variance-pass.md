---
created: 2026-02-26T20:22:46.079Z
updated: 2026-03-02T17:16:47.019Z
started: 2026-02-27T20:19:03.516Z
completed: 2026-03-01T04:42:30.130Z
---

# Diversity: instruction encoding variance pass

MOV_RI reg,0 to XOR reg,reg (with flag save/restore). MOV_RR to PUSH/POP. Stack gap insertion (dead PUSH/POP pairs). Identity padding. Extends polymorphic.h or standalone pass.

## Relations

- [requires diversity-bytecode-basic-block-reordering-pass](diversity-bytecode-basic-block-reordering-pass.md)
