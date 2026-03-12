---
created: 2026-03-11T16:26:08.904Z
updated: 2026-03-11T16:26:28.210Z
tags:
  - entry-stub
  - anti-pattern-matching
  - anti-ida
---

# LEA Cluster Breaking (Conditional + Interleaved)

**Problem**: ArgSetup emits up to 9 consecutive `LEA reg, [RIP+disp]` instructions, all loading pointers from the `.pecker` section. No normal function does this. A pattern match for 5+ consecutive RIP-relative LEAs pointing to the same section is a reliable stub detector.

**Solution (two-pronged)**:

1. **Skip LEAs for unused features**: Most stubs only need 2-3 LEAs (bytecode ptr, interpreter, maybe inverse_map). Skip encryption_key, nanomite_table, flow_key_table, wb_tables LEAs when the corresponding feature is disabled. Depends on `StubFeatureFlags` from the selective zero-init task.

2. **Interleave remaining LEAs with other work**: Add LEA emission blocks to the existing `ReorderGroup` shuffle infrastructure alongside arg copies and context field stores. Instead of 3 LEAs in a row, they get scattered among MOV instructions.

**Key file**: `include/PEcker/stub/entry_stub.h` - conditionally emit LEAs based on feature flags; wrap each LEA in its own reorderable block.

## Sub-tasks
- [ ] Gate each LEA emission on the corresponding StubFeatureFlags field
- [ ] Wrap individual LEA+store pairs as separate ReorderGroup blocks
- [ ] Verify LEA fixup offsets are correctly computed after reordering
- [ ] Unit test: verify stubs with minimal features emit only 2-3 LEAs
- [ ] Integration test: protect binary with all features enabled/disabled, verify correctness


## Relations
- [blocked by selective-context-zero-init-feature-gated](selective-context-zero-init-feature-gated.md)

