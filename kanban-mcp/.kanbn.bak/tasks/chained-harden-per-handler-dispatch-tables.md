---
created: 2026-02-26T20:58:52.671Z
updated: 2026-03-03T14:05:00.846Z
started: 2026-02-28T00:08:29.336Z
completed: 2026-03-03T14:05:00.846Z
---

# Chained harden: per-handler dispatch tables

Each handler gets its own 256x8 dispatch table stored in the .pecker section. Each table is a unique permutation. Eliminates R12 as uniform register convention - each handler uses RIP-relative LEA to its own table. Currently all handlers share one dispatch table built on the stack via R12. An analyst who dumps R12 has the complete mapping. With per-handler tables, each of the 54 handlers has its own table at a different section offset, requiring 54 separate analyses to reconstruct the full mapping. emitDispatchNext is replaced with per-handler RIP-relative table access. R12 is freed. Entry stub no longer builds table on stack. Section builder emits 54x2048=~110KB of per-handler tables. Highest complexity improvement. ~400 lines across chained_handlers.h, entry_stub.h, cmd_protect.h. Gated by --per-handler-tables (default false, opt-in due to size).

## Sub-tasks

- [x] Design per-handler table layout in .pecker section
- [x] Modify emitDispatchNext to use RIP-relative LEA + JMP [rax+rcx*8] pattern
- [x] Add per-handler dispatch_table_lea_fixup to ChainedHandler struct
- [x] Generate 54 unique dispatch tables in generateChainedHandlerSet()
- [x] Remove R12-based dispatch table from entry stub
- [x] Adjust entry stub stack allocation (remove DISPATCH_TABLE_SIZE)
- [x] Update section builder to emit per-handler tables and fixup RIP-relative LEAs
- [x] Add per_handler_tables field to PeckerConfig and --per-handler-tables to args parser
- [x] Add tests: verify each handler table is a valid permutation, verify R12 not used when enabled

## Relations

- [requires chained-harden-polymorphic-dispatch-epilogue](chained-harden-polymorphic-dispatch-epilogue.md)
