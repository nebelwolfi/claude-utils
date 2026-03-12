---
created: 2026-02-26T20:20:23.601Z
updated: 2026-03-01T22:16:41.085Z
started: 2026-02-26T21:14:12.442Z
completed: 2026-02-26T22:30:00.000Z
---

# Nanomite: VM interpreter handler

Add VM_NANOMITE handler to all 4 dispatch modes. Handler reads trap_id, looks up NanomiteEntry via findNanomite() on VmContext, evaluates condition against RFLAGS (mirrors existing Jcc flag checks), jumps to taken or fallthrough. Add nanomite_table/nanomite_count to VmContext and FlatVmContext. Add chained handler in chained_handlers.h. Update entry_stub.h offsets if FlatVmContext grows.

## Relations

- [requires nanomite-opcode-and-metadata-infrastructure](nanomite-opcode-and-metadata-infrastructure.md)
