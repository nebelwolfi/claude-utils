---
created: 2026-03-04T13:26:52.120Z
updated: 2026-03-04T13:26:52.120Z
priority: high
tags:
  - anti-analysis
  - anti-debug
  - veh
  - exceptions
---

# Exception-Based Anti-Debug

## Overview
Register a VEH, trigger specific exceptions, verify VEH caught them. Debuggers swallow certain exceptions before VEH fires, revealing their presence via canary state divergence.

## Files
- **Create**: `include/PEcker/anti_analysis/exception_anti_debug.h`
- **Create**: `tests/exception_anti_debug_tests.cpp`
- **Modify**: `config.h`, `anti_debug.h` (add ExceptionAntiDebugResult field), `anti_analysis.h`

## 6 Exception Techniques
1. **INT 3 (0xCC)**: STATUS_BREAKPOINT - debugger consumes, VEH never fires
2. **INT 2D**: STATUS_BREAKPOINT - debugger advances RIP by extra byte; NOP after INT 2D handles this
3. **Trap Flag**: Set TF in EFLAGS via pushfq/or/popfq → STATUS_SINGLE_STEP on next instruction; VEH clears TF
4. **PAGE_GUARD**: VirtualAlloc + VirtualProtect(PAGE_GUARD) → access triggers STATUS_GUARD_PAGE_VIOLATION
5. **CloseHandle(0xDEADBEEF)**: INVERSE check - under debugger raises EXCEPTION_INVALID_HANDLE; without debugger, just returns error
6. **OutputDebugString**: Disabled by default (unreliable on modern Windows)

## Canary Mechanism
- Thread-local `ExceptionCanary` struct: `volatile state` (PENDING→CAUGHT), `expected_code`, `resume_rip`
- `__declspec(thread)` TLS for thread safety (concurrent VM checks on different threads)
- VEH handler: verify `canary.state == PENDING` + `exception_code == expected` → set CAUGHT, fix Rip
- Magic canary values (not booleans) resist memory patches: PENDING=0xDEAD0001, CAUGHT=0xCAFE0002

## Implementation
- `ExceptionAntiDebugGuard` RAII class: AddVectoredExceptionHandler(1, ...) at front of chain
- GNU-style inline asm for INT3/INT2D/TF with `%=` unique labels and RIP-relative resume address capture
- Per-technique enable flags in `ExceptionAntiDebugConfig`
- ~20 test cases (struct, stub, live VEH checks without debugger)

## Sub-tasks
- [x] Add PECKER_ENABLE_EXCEPTION_ANTI_DEBUG to config.h
- [x] Create exception_anti_debug.h: ExceptionCanary TLS, VEH handler, RAII guard
- [x] Implement checkInt3() with inline asm and resume label
- [x] Implement checkInt2d() with NOP after INT 2D
- [x] Implement checkTrapFlag() via pushfq/or/popfq TF setting
- [x] Implement checkGuardPage() with VirtualAlloc + PAGE_GUARD
- [x] Implement checkCloseHandle() (inverse check)
- [x] Integrate into anti_debug.h AntiDebugResult + checkDebugger()
- [x] Create tests/exception_anti_debug_tests.cpp (~20 tests incl. live VEH)

