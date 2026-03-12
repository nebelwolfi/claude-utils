---
created: 2026-03-12T10:26:35.457Z
updated: 2026-03-12T10:51:25.049Z
completed: 2026-03-12T10:27:08.665Z
started: 2026-03-12T10:44:28.116Z
---

# Mixed PUSH/MOV Register Saves (.pdata Camouflage)

---
created: 2026-03-12T09:10:48.693Z
updated: 2026-03-12T09:52:37.718Z

# Mixed PUSH/MOV Register Saves (.pdata Camouflage)

**Problem**: Every entry stub emits exactly 8 `UWOP_PUSH_NONVOL` entries + `UWOP_ALLOC_LARGE(~29KB)` in `.pdata`. A single IDA Python query on the exception directory finds ALL protected functions in seconds. This is the #1 detection vector.

**Solution**: Vary the number of PUSHed callee-saves per stub (3-8, weighted toward 4-6). Remaining registers saved via `MOV [RSP+offset], reg` after `SUB RSP`, recorded as `UWOP_SAVE_NONVOL` (op=4) in `.pdata` instead of `UWOP_PUSH_NONVOL` (op=0). This is standard Windows unwind machinery - MSVC uses it for functions with frame pointers.

**Alignment math**: With N pushes, `computeStackAlloc` must take `num_pushes` as parameter:
- N even → RSP ≡ 8 (mod 16) → alloc ≡ 8 (mod 16)
- N odd → RSP ≡ 0 (mod 16) → alloc ≡ 0 (mod 16)

**EntryStub struct changes**: Add `num_pushes`, `mov_save_offsets[]`, `mov_save_regs[]` so `cmd_protect.h` can emit correct unwind info.

**Key files**:
- `include/PEcker/stub/entry_stub.h` - `generateEntryStub()` + `generateChainedEntryStub()`: add `computePushCount(seed, index)`, split callee-saves into PUSH group + MOV-save group, epilogue restores MOV-saved before ADD RSP
- `include/PEcker/stub/stub_metamorph.h` - `emitMovRegToMem64` helper
- `include/PEcker/commands/cmd_protect.h` ~L4249-4270 - emit `UWOP_SAVE_NONVOL` (op=4, extra u16 = offset/8) for MOV-saved regs
- `tests/entry_stub_tests.cpp` - test varying push counts, unwind info correctness

## Sub-tasks
- [x] Add `computePushCount(seed, index)` -> returns 3-8 weighted toward 4-6
- [x] Modify `computeStackAlloc` to accept `num_pushes` and fix alignment for odd/even push counts
- [x] Split callee-save list: first N -> PUSH, remaining -> MOV [RSP+offset] after SUB RSP
- [x] Add `mov_save_offsets[]` and `mov_save_regs[]` to EntryStub/ChainedEntryStub structs
- [x] Update epilogue: restore MOV-saved regs before ADD RSP, then POP pushed regs
- [ ] Update `cmd_protect.h` .pdata emission: emit UWOP_SAVE_NONVOL (op=4) for MOV-saved registers
- [ ] Apply same changes to `generateChainedEntryStub` and simplified chained stub
- [ ] Unit tests: verify alignment invariant for all push counts 3-8
- [ ] Unit tests: verify UWOP_SAVE_NONVOL encoding round-trips through ExceptionDirBuilder
- [ ] Integration test: generate 50+ stubs, verify no two have identical .pdata signatures

