---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T16:38:10.896Z
started: 2026-03-03T16:34:47.502Z
completed: 2026-03-03T16:37:28.596Z
tags:
  - core
  - assembly
  - chained
---

# Chained: Handler set assembly and shuffling

Top-level `generateChainedHandlerSet()` that combines all 49 handler blobs into a single shuffled binary blob with a dispatch_offsets[256] table.

## Key Design

Flag helpers and error/halt handlers are at known offsets within the blob. Individual handlers use relative CALL (for flags) or relative JMP (for error/halt) to reach them. These relative offsets must be patched AFTER the blob is assembled, because handler positions depend on shuffle order + padding.

Each handler is generated with placeholder CALL/JMP offsets (e.g., 0x00000000). After assembly, iterate through handlers and patch these offsets based on the final positions.

## Sub-tasks

- [x] Implement `generateChainedHandlerSet(u64 seed, const u8* inverse_map)` function
- [x] Call all 49 handler generators + error + halt + flag helpers
- [x] Fisher-Yates shuffle handler order using seed
- [x] Insert random padding (0-64 bytes, filled with random values) between handlers
- [x] Concatenate shuffled handlers into combined blob, recording each handler's offset
- [x] Append flag helper code block to end of blob, record flag helper offsets
- [x] Append error handler and halt handler to blob
- [x] Patch relative CALL offsets in ALU handlers to point to flag helpers (post-concat fixup)
- [x] Patch error handler JMP offsets in DIV/PUSH/POP handlers (post-concat fixup)
- [x] Patch halt handler JMP offsets in HALT/RET handlers (post-concat fixup)
- [x] Build `dispatch_offsets[256]`: for each raw byte 0-255, if inverse_map: canonical = inverse_map[byte], else canonical = byte; store handler offset for canonical opcode (or error handler offset for invalid)
- [x] Return ChainedHandlerSet with combined blob + dispatch_offsets table
