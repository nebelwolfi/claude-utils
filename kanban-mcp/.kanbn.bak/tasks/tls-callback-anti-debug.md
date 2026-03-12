---
created: 2026-03-04T13:26:30.070Z
updated: 2026-03-05T18:55:13.563Z
priority: high
tags:
  - anti-analysis
  - anti-debug
  - tls
  - pe-modification
started: 2026-03-05T18:55:13.563Z
---

# TLS Callback Anti-Debug

## Overview

Run anti-debug checks before `main()` via PE TLS callbacks. Generates native x86-64 shellcode, injects into `.pecker` section, creates/extends `IMAGE_TLS_DIRECTORY64`.

## Files

- **Create**: `include/PEcker/anti_analysis/tls_anti_debug.h`
- **Create**: `tests/tls_anti_debug_tests.cpp`
- **Modify**: `cmd_protect.h` (pipeline steps 6b2, 6d, 7c), `pe_writer.h` (setTlsDirectory), `config.h`, `args.h`, `anti_analysis.h`

## Shellcode (~80-120 bytes)

```
cmp edx, 1                    ; DLL_PROCESS_ATTACH only
jne .ret
mov rax, gs:[0x60]            ; PEB
movzx ecx, byte [rax+2]      ; BeingDebugged
test ecx, ecx / jnz .detected
mov eax, [rax+0xBC]           ; NtGlobalFlag
and eax, 0x70 / jnz .detected
.ret: ret
.detected: mov ecx, 7; int 0x29  ; __fastfail(FAST_FAIL_FATAL_APP_EXIT)
```
- Uses `int 0x29` (__fastfail) - no imports needed, cannot be caught by SEH, works before CRT init
- Optional junk NOP insertion between checks (seeded from build seed)
- Emitted using `stub_detail::emit()` helpers for consistency

## TLS Directory Injection

- **No existing TLS**: Create full IMAGE_TLS_DIRECTORY64 (40 bytes) + callback array + TLS index in .pecker
- **Existing TLS**: Preserve all original callbacks, prepend our anti-debug callback (runs first)
- Update `DataDirectory[IMAGE_DIRECTORY_ENTRY_TLS]` to point to new directory
- .pecker section must have `IMAGE_SCN_MEM_WRITE` (TLS index is writable)
- ASLR disabled (IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE cleared), so absolute VAs work

## Edge Cases

- Self-contained shellcode (no .text dependencies) - safe with `--pack`
- Preserves existing TLS template data (StartAddressOfRawData/EndAddressOfRawData)
- dwReason filter: only fires on DLL_PROCESS_ATTACH (1), not thread attach/detach
- ~19 test cases (shellcode generation, TLS directory building, PE roundtrip)

## Sub-tasks

- [x] Create tls_anti_debug.h: generateTlsAntiDebugCallback() shellcode generator
- [x] Implement buildTlsDirectoryPatch() for creating/extending TLS directory
- [x] Integrate into cmd_protect.h pipeline (Step 6b2: shellcode, Step 6d: TLS structures, Step 7c: DataDirectory)
- [x] Add setTlsDirectory() to pe_writer.h or use patchBytes()
- [x] Handle existing TLS callbacks preservation (prepend our callback)
- [x] Add --tls-anti-debug CLI flag + --shizo preset
- [x] Ensure .pecker gets IMAGE_SCN_MEM_WRITE when TLS active
- [x] Create tests/tls_anti_debug_tests.cpp (~19 tests incl. PE roundtrip)
