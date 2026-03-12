---
created: 2026-03-04T13:26:03.408Z
updated: 2026-03-05T18:50:01.902Z
priority: critical
tags:
  - obfuscation
  - encryption
  - anti-debug
  - key-derivation
started: 2026-03-05T17:47:33.602Z
completed: 2026-03-05T18:50:01.902Z
---

# Context-Sensitive Key Derivation

## Overview

Derive encryption keys at runtime from the process environment fingerprint. Running under a debugger, in a sandbox, or on a different OS produces wrong keys → silent bytecode corruption.

## Files

- **Create**: `include/PEcker/anti_analysis/context_key.h`
- **Create**: `include/PEcker/anti_analysis/context_key_flat.h` (freestanding C for PIC blob)
- **Create**: `tests/context_key_tests.cpp`
- **Modify**: `config.h`, `vm_engine_flat.h` (FlatVmContext + decryption preamble), `entry_stub.h` (CTX_SIZEOF + salt store), `chained_handlers.h` (offsets), `encryption.h` (adjustKeyForContext), `pipeline.h`, `cmd_protect.h` (embed salt + adjust stored key), `args.h`, `anti_analysis.h`

## Fingerprint Sources (ASLR-safe, content-only)

- **NtGlobalFlag**: `PEB+0xBC` - 0x00 clean, 0x70 under debugger (strongest signal)
- **ProcessHeap.Flags**: `PEB+0x30→+0x70` - heap flags differ under debugger
- **Module list hash**: FNV-1a of all BaseDllName (wide) from PEB→Ldr walk
- **ntdll TimeDateStamp**: OS version fingerprint from ntdll PE header
- **Excluded**: ImageBaseAddress, PID, TID, security cookie, RDTSC (all ASLR/launch-variant)

## Key Derivation

- `deriveContextKey()`: FNV-1a 64-bit mixing of salt + ntglobal_flag + heap_flags + module_hash + ntdll_timestamp
- Expand 64-bit key to 16 bytes, XOR into stored encryption key[32]
- **Build-time**: `stored_key = original_key XOR expected_context_key_expansion`
- **Runtime**: `effective_key = stored_key XOR runtime_context_key_expansion`
- If runtime == expected → correct key. If debugger → wrong key → garbage decryption

## Design: Silent Corruption (no patch point)

- No explicit check-and-trap - wrong key produces "natural" crashes (access violation, invalid opcode)
- Per-build random 64-bit salt prevents cross-build known-plaintext attacks
- Default: hash only NtGlobalFlag + HeapFlags (zero false positives). Module hash + ntdll timestamp opt-in via config.
- ~14 test cases including simulated-debugger fingerprint

## Sub-tasks

- [x] Create context_key.h: collectFingerprint(), deriveContextKey(), applyContextKey(), canonicalFingerprint()
- [x] Create context_key_flat.h: freestanding C versions for PIC blob
- [x] Add context_key_salt field to FlatVmContext in vm_engine_flat.h
- [x] Insert derivation call in decryption preamble (before flat_xor_rotate_crypt)
- [x] Update entry_stub.h: CTX_SIZEOF, salt offset, emit salt store instruction
- [x] Add adjustKeyForContext() to encryption.h for build-time key transformation
- [x] Modify cmd_protect.h: embed salt in .pecker section, adjust stored key at protection time
- [x] Wire --context-key CLI flag through args.h/config.h/pipeline.h
- [x] Create tests/context_key_tests.cpp (~14 tests incl. simulated debugger)
