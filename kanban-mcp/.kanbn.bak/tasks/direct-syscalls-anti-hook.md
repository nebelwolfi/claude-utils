---
created: 2026-03-04T13:24:22.196Z
updated: 2026-03-05T17:42:27.350Z
started: 2026-03-05T12:06:38.684Z
priority: critical
tags:
  - anti-analysis
  - anti-hook
  - syscall
  - frida
completed: 2026-03-05T17:42:27.350Z
---

# Direct Syscalls (Anti-Hook)

## Overview

Bypass ntdll usermode hooks (Frida, x64dbg plugins) by resolving System Service Numbers at runtime and issuing `syscall` instructions from PEcker's own code.

## Architecture (3 Layers)

1. **SSN Resolver**: Parse ntdll.dll export table via PEB walk (not GetProcAddress), extract SSN from `MOV EAX, SSN` at each Zw* stub
2. **Syscall Stub Emitter**: Generate 16-byte executable stubs (`mov r10, rcx; mov eax, SSN; syscall; ret`) in an allocated RWX page
3. **Integration Layer**: `direct_syscall(...)` replaces `lazy_call("ntdll.dll", ...)` in anti-analysis code

## Files

- **Create**: `include/PEcker/anti_analysis/direct_syscall.h`
- **Create**: `tests/direct_syscall_tests.cpp`
- **Modify**: `config.h`, `anti_debug.h` (replace lazy_call with direct syscall path), `anti_analysis.h` (propagate SyscallDispatch*), `memory_guard.h`, `anti_dump.h`, `args.h`

## Key Details

- **Halo's Gate fallback**: When a stub is hooked (first bytes ≠ `4C 8B D1 B8`), scan neighboring Zw stubs and interpolate SSN
- **Hook detection**: Verify ntdll stubs for `E9` (JMP), `FF 25` (JMP [rip+disp]), `48 B8` (MOV RAX, imm64) patterns
- **9 Nt functions**: NtQueryInformationProcess, NtQuerySystemInformation, NtSetInformationThread, NtReadVirtualMemory, NtProtectVirtualMemory, NtWriteVirtualMemory, NtAllocateVirtualMemory, NtFreeVirtualMemory, NtClose
- **Bootstrap**: Use inline raw `syscall` for NtAllocateVirtualMemory to allocate the stub page itself
- **NtProtectVirtualMemory wrapper**: Handle signature difference from VirtualProtect (pointer-to-pointer params)
- Stub page: 9 × 16 = 144 bytes, fits in one 4096-byte page
- ~15 test cases

## Sub-tasks

- [x] Add PECKER_ENABLE_DIRECT_SYSCALL to config.h
- [x] Create direct_syscall.h: SSN resolver via PEB ntdll export walk
- [x] Implement Halo's Gate fallback for hooked stubs
- [x] Implement stub page builder (16-byte stubs × 9 functions)
- [x] Implement hook detection (verifyNtdllStubIntegrity)
- [x] Create typed invoker template + SyscallDispatch init/cleanup
- [x] Modify anti_debug.h to use direct syscalls for NtQueryInformationProcess
- [x] Modify anti_analysis.h to propagate SyscallDispatch* through config
- [x] Add --direct-syscall CLI flag
- [x] Create tests/direct_syscall_tests.cpp (~15 tests)
- [x] Implement stub page builder (16-byte stubs x 9 functions)
