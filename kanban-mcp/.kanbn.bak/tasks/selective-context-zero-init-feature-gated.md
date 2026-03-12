---
created: 2026-03-11T16:25:59.071Z
updated: 2026-03-12T10:51:25.097Z
started: 2026-03-12T10:45:00.308Z
tags:
  - entry-stub
  - anti-pattern-matching
  - anti-ida
  - zero-init
---

# Selective Context Zero-Init (Feature-Gated)

**Problem**: Every stub zeros ~13,504 bytes (full FlatVmContext). Even with 6 zero-init strategies, the sheer volume of zero-writes to a contiguous 13.5KB region is a strong signature detectable by memory tracing or static pattern matching.

**Solution**: Pass feature flags to stub generation indicating which context fields are actually used (has_encryption, has_nanomites, has_flow_keys, has_wb_aes, has_timing, has_guard). Only zero fields relevant to each stub:

**Minimal set (always zeroed, ~228 bytes)**:
- `registers[0..23]` (192B)
- `bytecode`, `bytecodeSize`, `inverse_map` (24B)
- `stack_top`, `status`, `exception_frame_count` (12B)

**Conditional sets**:
- `encryption_key` + `encryption_mode` (36B) - only if has_encryption
- `nanomite_table` + `nanomite_count` (20B) - only if has_nanomites
- `flow_key_*` fields (28B) - only if has_flow_keys
- `wb_tables` (12B) - only if has_wb_aes
- `timing` (576B) - only if has_timing
- `guard_*` fields (44B) - only if has_guard

A stub without optional features zeros ~230 bytes instead of 13,504. This also improves startup performance.

**Key files**:
- `include/PEcker/stub/entry_stub.h` - add `StubFeatureFlags`, modify zero-init to emit targeted MOV QWORD [RSP+off], 0 for small regions
- `include/PEcker/commands/cmd_protect.h` - populate feature flags from protection config

## Sub-tasks
- [x] Integration test: protect binaries with various feature combos, verify correctness

