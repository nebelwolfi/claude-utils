---
created: 2026-03-04T10:38:18.942Z
updated: 2026-03-05T10:17:29.318Z
started: 2026-03-05T02:00:43.778Z
completed: 2026-03-05T10:17:12.938Z
priority: high
tags:
  - anti-analysis
  - breakpoint
  - debug-registers
---

# Hardware Breakpoint Detection (DR0-DR3)

## Overview

Detect hardware breakpoints by reading debug registers DR0-DR3, DR6, DR7 via `GetThreadContext` / `NtGetContextThread` across all process threads.

## Files

- **Create**: `include/PEcker/anti_analysis/hw_breakpoint.h`
- **Create**: `tests/hw_breakpoint_tests.cpp`
- **Modify**: `config.h` (toggle), `anti_analysis.h` (integrate), `args.h` (CLI flag), `config_loader.h`, `project_file.h`, `anti_analysis_config_view.h` (GUI), `cmd_protect.h`

## Key Details

- `HwBreakpointResult` struct: `threads_scanned`, `threads_with_hw_bp`, `total_hw_breakpoints`, `dr7_enabled`, `scan_failed`
- Two variants: `checkHwBreakpoints()` (kernel32 path) and `checkHwBreakpointsNt()` (ntdll stealth path)
- Enumerate all threads via `CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD)`, suspend each, read CONTEXT_DEBUG_REGISTERS
- Current thread: no suspend needed for debug register reads
- DR7 bits 0-7 = local/global enable for DR0-DR3; bits 16-31 = R/W + LEN
- Compile-time gated: `PECKER_ENABLE_HW_BREAKPOINT_SCAN`
- ~12 test cases covering struct, stubs, aggregate integration

## Sub-tasks

- [x] Add PECKER_ENABLE_HW_BREAKPOINT_SCAN to config.h
- [x] Create hw_breakpoint.h with HwBreakpointResult, checkHwBreakpoints(), checkHwBreakpointsNt()
- [x] Integrate into anti_analysis.h (include, result field, isClean, runner call)
- [x] Add CLI flag --hw-breakpoint-scan in args.h + config.h + config_loader.h
- [x] Update GUI anti_analysis_config_view.h with new technique enum
- [x] Update project_file.h serialization
- [x] Create tests/hw_breakpoint_tests.cpp (~12 tests)
- [x] Update existing aggregate tests in anti_analysis_tests.cpp
