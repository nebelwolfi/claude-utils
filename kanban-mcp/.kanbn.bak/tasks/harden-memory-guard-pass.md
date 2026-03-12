---
created: 2026-03-04T14:06:19.436Z
updated: 2026-03-07T12:01:31.147Z
started: 2026-03-07T00:25:34.935Z
completed: 2026-03-07T11:52:10.203Z
tags:
  - hardening
  - memory-guard
  - existing-pass
---

# Harden MemoryGuardPass

## Overview

Three improvements: persistent PAGE_GUARD via VEH re-arming, direct syscalls for NtProtectVirtualMemory, and periodic protection verification.

## Improvement 1: Re-arm PAGE_GUARD in VEH Handler

Current PAGE_GUARD is single-shot - fires once per page then clears.
- Register a VEH handler via `AddVectoredExceptionHandler(1, handler)`
- On STATUS_GUARD_PAGE_VIOLATION:
  - Check if fault address is within protected bytecode region
  - Log/flag the access (external read attempt)
  - Allow the access to proceed (return EXCEPTION_CONTINUE_EXECUTION)
  - Schedule re-arming: after a brief delay (or on next VM instruction), re-apply PAGE_GUARD
- **Distinguishing legitimate vs attacker access**: legitimate access comes from the VM interpreter (IP within .pecker section); attacker access comes from elsewhere. Check ExceptionRecord->ExceptionAddress and CONTEXT->Rip.
- Re-arm via deferred call: set a flag in FlatVmContext, interpreter re-applies PAGE_GUARD at next instruction boundary
- VEH handler is PIC (~100-150 bytes), embedded in .pecker section

## Improvement 2: Direct Syscall for NtProtectVirtualMemory

VirtualProtect → NtProtectVirtualMemory is user-mode hookable.
- Resolve SSN (System Service Number) dynamically from ntdll.dll export table
- Walk ntdll exports, find NtProtectVirtualMemory, read `MOV EAX, SSN` from the stub
- Emit direct `syscall` instruction with the resolved SSN
- Dynamic resolution avoids hardcoding per-Windows-version SSNs
- New helper: `resolveSyscallNumber(const char* func_name) -> u32`
- PIC-compatible: resolve at loader stub init time, cache SSN in .pecker section data

## Improvement 3: Periodic Protection Verification

Attacker may change page protections between guard checks.
- Every N instructions (or on a timer), re-read page protections via NtQueryVirtualMemory
- Compare against expected state (PAGE_EXECUTE_READ for bytecode, PAGE_GUARD if armed)
- If mismatch detected: re-apply correct protections and flag tampering
- Can use direct syscall for NtQueryVirtualMemory too (bypass hooks)
- New FlatVmContext fields: `expected_page_prot`, `guard_check_interval`, `guard_counter`
- Integration: alongside FLAT_TIMING_CHECK in dispatch loop

## Key Files

- `include/PEcker/anti_analysis/memory_guard.h` - VEH re-arm, direct syscall, periodic verify
- `include/PEcker/loader/loader_stub.h` - SSN resolution at init, VEH registration
- `include/PEcker/vm/vm_engine_flat.h` - periodic protection check in dispatch loop
- `include/PEcker/commands/cmd_protect.h` - section layout for VEH handler + SSN cache
- `include/PEcker/common/config.h` - PECKER_ENABLE_MEMORY_GUARD_V2 toggle

## SSN Resolution Design

```
1. Walk PEB → InLoadOrderModuleList → find ntdll.dll base
2. Parse ntdll PE: export directory → find NtProtectVirtualMemory by name
3. Read first 4 bytes of the export: expect MOV EAX, imm32 (4C 8B D1 B8 xx xx xx xx on Win10+)
4. Extract SSN from bytes [4..8]
5. For syscall: MOV R10, RCX; MOV EAX, SSN; SYSCALL; RET
```

## VEH Handler Pseudocode

```
On STATUS_GUARD_PAGE_VIOLATION:
  if fault_addr in [bytecode_base, bytecode_base + bytecode_size):
    if ctx->Rip NOT in [pecker_section_base, pecker_section_end):
      // External access - flag it
      ctx->guard_violation_count++
    // Allow access (guard auto-cleared by CPU)
    // Set deferred re-arm flag
    flatctx->rearm_guard = 1
    return EXCEPTION_CONTINUE_EXECUTION
  else:
    return EXCEPTION_CONTINUE_SEARCH
```

## Sub-tasks

- [x] Write periodic verification tests (detect protection change, re-apply)
