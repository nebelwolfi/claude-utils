---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T19:55:10.610Z
started: 2026-03-03T16:38:49.485Z
completed: 2026-03-03T19:54:17.163Z
tags:
  - integration
  - section-builder
  - chained
---

# Chained: Integrate into section builder

Modify `buildPeckerSectionV2()` in `include/PEcker/commands/cmd_protect.h` for chained dispatch mode.

## Sub-tasks

- [x] Update `selectFlatVmBlob()`: return blob=nullptr, blob_size=0, entry_offset=0 for Chained mode
- [x] In `buildPeckerSectionV2()`, add chained-mode branch when `dispatch_mode == Chained`
- [x] Call `generateChainedHandlerSet(seed, inverse_map)` to get handler blob + dispatch_offsets
- [x] Compute section layout: header, directory, handler_blob, dispatch_offsets[256x4], inverse_map, enc_key, per-func entries
- [x] Generate `ChainedEntryStub` per function via `generateChainedEntryStub()` (with placeholder displacements)
- [x] Compute per-function layout: chained_entry_stub + thunk_block + bytecode + sentinel
- [x] Patch RIP-relative fixups: handler_blob_lea, dispatch_offsets_lea, bytecode_lea, inverse_map_lea, encryption_key_lea
- [x] Write handler blob, dispatch_offsets table, inverse_map, enc_key to section data
- [x] Write per-function entry stubs, thunks, bytecodes (same logic as existing)
- [x] Patch NATIVE_CALL sentinels with thunk VAs (same logic as existing)
- [x] Post-sentinel encryption of bytecodes (same logic as existing)
- [x] Add leaf-function RUNTIME_FUNCTION for handler blob region: UNWIND_INFO with version=1, flags=0, count_of_codes=0
- [x] Store handler blob offset in SectionBuildResult and PeckerSectionHeader.reserved
- [x] Update SectionBuildResult with chained stub sizes and prolog offsets for .pdata entries
