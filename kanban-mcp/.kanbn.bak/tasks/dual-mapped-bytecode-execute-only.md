---
created: 2026-03-04T13:25:40.009Z
updated: 2026-03-04T13:25:40.009Z
priority: high
tags:
  - anti-analysis
  - anti-dump
  - memory-protection
---

# Dual-Mapped Bytecode (Execute-Only)

## Overview
Map bytecode twice via NtCreateSection + NtMapViewOfSection: one RX view (execute-only, prevents dumps) and one R view (readable, for decryption). Dumpers see the RX mapping and cannot read bytecode.

## Files
- **Create**: `include/PEcker/anti_analysis/dual_map.h`
- **Create**: `tests/dual_map_tests.cpp`
- **Modify**: `config.h`, `anti_analysis.h`, `loader_stub.h` (ntdll API resolution + dual-map init loop), `entry_stub.h` (LEA→MOV opcode change for pointer table), `cmd_protect.h` (DualMapPointerTable in section layout, FLAG_DUAL_MAP), `memory_guard.h`

## Architecture
- **Loader stub approach**: Resolve NtCreateSection/NtMapViewOfSection from ntdll via PEB walk, create dual maps for all functions at startup, fill pointer table
- **Section layout**: Add `DualMapPointerTable[N]` (N × 8 bytes) after function directory
- **Entry stub change**: `LEA RAX, [RIP+disp]` (0x8D) → `MOV RAX, [RIP+disp]` (0x8B) to load R-view pointer from table
- **Interpreter unchanged**: `ctx->bytecode` points to R view, data reads work normally
- **Execute-only**: `PAGE_EXECUTE` (no read) on Windows 10 1803+ with CFG/EPT

## Key Considerations
- `verifyExecuteOnly()`: Install VEH, read 1 byte from RX view, check for STATUS_ACCESS_VIOLATION
- Fallback when execute-only unavailable: degrade to MemoryGuard (PAGE_GUARD)
- Per-call vs loader-stub: configurable (per-call = more secure, loader-stub = less overhead)
- Re-randomization interaction: inverse map is separate from bytecode, unaffected
- Flow-sensitive encryption: reads from R view normally, no changes needed
- Handle cleanup table in .pecker for NtUnmapViewOfSection/NtClose

## Sub-tasks
- [ ] Create dual_map.h: createDualMap, destroyDualMap, verifyExecuteOnly, DualMapGuard RAII
- [ ] Add PECKER_ENABLE_DUAL_MAP + config fields
- [ ] Modify cmd_protect.h: reserve DualMapPointerTable in section layout, set FLAG_DUAL_MAP
- [ ] Modify entry_stub.h: LEA→MOV opcode change (0x8D→0x8B) for pointer table indirection
- [ ] Extend loader_stub.h: PEB-walk ntdll, resolve NtCreateSection/NtMapViewOfSection, dual-map loop
- [ ] Integrate with memory_guard.h (skip enforce_rx when dual-map active)
- [ ] Implement fallback detection + MemoryGuard fallback
- [ ] Create tests/dual_map_tests.cpp (~16 tests incl. execute-only verification)

