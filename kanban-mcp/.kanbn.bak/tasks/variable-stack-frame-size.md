---
created: 2026-03-11T07:59:52.204Z
updated: 2026-03-11T08:00:31.683Z
completed: 2026-03-11T08:00:31.683Z
---

# Variable Stack Frame Size

Add random 0-4096 byte padding (16-byte aligned) to STACK_ALLOC per stub. Each stub gets a unique allocation size, defeating signature-based detection of the ~29KB allocation pattern.

**Design**: Padding placed between shadow space and context. `EFFECTIVE_SHADOW = SHADOW + padding`. All RSP-relative context refs shift by padding amount. Context at `RSP + SHADOW + padding`.

**Changes per stub**:
- Probe loop iteration count varies (more pages to probe)
- `SUB RSP, EFF_STACK_ALLOC` uses per-stub value
- All `[RSP + SHADOW + CTX_*]` become `[RSP + CTX_BASE + CTX_*]`
- Epilogue `ADD RSP, EFF_STACK_ALLOC` matches
- .pdata UWOP_ALLOC_LARGE reflects per-stub allocation
- Stack arg copy source offset adjusts

**New EntryStub fields**: `u32 stack_alloc` (actual allocation), `u32 ctx_base` (SHADOW + padding).

**Activation**: When `diversity_seed != 0`. Padding derived from seed via separate RNG stream.

**Alignment**: padding is always multiple of 16 → RSP alignment preserved.

**Key files**: entry_stub.h (compute padding, replace all SHADOW refs with CTX_BASE), cmd_protect.h (read per-stub stack_alloc for .pdata)

## Completed subtasks

1. Add ctx_base field to EntryStub/FragmentedEntryStub/ChainedEntryStub - DONE
2. Add computeStubPadding for per-stub variable stack frame size - DONE
3. Replace all SHADOW references with ctx_base in generateEntryStub() - DONE
4. Probe loop uses EFF_STACK_ALLOC (verified + tests) - DONE
5. Epilogue ADD RSP uses EFF_STACK_ALLOC (verified + tests) - DONE
6. Stack arg copy source offset adjusts (verified + tests) - DONE
