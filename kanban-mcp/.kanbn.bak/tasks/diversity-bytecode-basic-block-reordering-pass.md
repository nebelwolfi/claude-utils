---
created: 2026-02-26T20:22:43.117Z
updated: 2026-03-02T17:15:04.662Z
started: 2026-02-27T20:19:02.061Z
completed: 2026-03-01T04:41:37.085Z
---

# Diversity: bytecode basic block reordering pass

New ObfuscationPass in block_reorder.h. Reuses identifyBlocks() from cfg_flatten.h. Fisher-Yates shuffles block order, rebuilds bytecode, patches jump offsets. Insert JMP for broken fallthrough. Pipeline: before Flatten. Pass name reorder.

## Relations

- [requires diversity-config-and-seed-infrastructure](diversity-config-and-seed-infrastructure.md)
