---
created: 2026-02-26T20:22:40.316Z
updated: 2026-03-02T12:01:41.158Z
started: 2026-02-27T20:11:14.199Z
completed: 2026-03-01T04:02:28.920Z
---

# Diversity: native handler implementation variance

Add 2-3 structurally different x86-64 implementations per chained handler (ALU: ADD/SUB/XOR/AND/OR, MOV_RR, MOV_RI, CMP, TEST). E.g., ADD variants: (A) current, (B) swapped loads + LEA, (C) in-place. Selection via seed in generateChainedHandlerSet(). Highest anti-RE impact.

## Relations

- [requires diversity-config-and-seed-infrastructure](diversity-config-and-seed-infrastructure.md)
