---
created: 2026-02-26T20:20:16.089Z
updated: 2026-03-02T22:42:44.330Z
started: 2026-02-26T20:47:38.868Z
completed: 2026-02-26T21:00:14.279Z
---

# Nanomite: opcode and metadata infrastructure

Add VM_NANOMITE=0x80 to Opcode enum, instrSize()=5, encode/decode helpers. Define NanomiteCondition enum (JZ/JNZ/JL/JG/JB/JA/JS/JNS/Decoy) and NanomiteEntry struct (trap_id, condition, taken_offset, fallthrough_offset). Add nanomite_table field to BytecodeProgram. Add VM_NANOMITE to ALL_OPCODES in opcode_map.h.
