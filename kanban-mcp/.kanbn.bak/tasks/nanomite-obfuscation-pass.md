---
created: 2026-02-26T20:20:19.677Z
updated: 2026-03-02T11:20:03.260Z
started: 2026-02-26T21:01:52.374Z
completed: 2026-02-26T21:11:59.761Z
---

# Nanomite: obfuscation pass

Create include/PEcker/obfuscation/nanomite.h with NanomitePass extending ObfuscationPass. Scans bytecode for conditional jumps, replaces in-place with VM_NANOMITE+trap_id (same 5-byte size = no offset fixup needed). NanomiteConfig: density (float), false_density (float), seed (u64). Builds NanomiteEntry table with correct condition types and offsets. Runs after Flatten, before Polymorphic.

## Relations

- [requires nanomite-opcode-and-metadata-infrastructure](nanomite-opcode-and-metadata-infrastructure.md)
