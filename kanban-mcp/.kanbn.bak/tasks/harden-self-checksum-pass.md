---
created: 2026-03-10T14:02:34.961Z
updated: 2026-03-12T09:06:04.374Z
started: 2026-03-10T20:36:14.511Z
completed: 2026-03-12T00:56:00.530Z
---

# Harden SelfChecksumPass

## Overview

Three improvements: HMAC-SHA256 instead of CRC32, comprehensive breakpoint scanning, and continuous runtime checksumming.

## Improvement 1: Replace CRC32 with HMAC-SHA256

CRC32 is not cryptographic - attacker can recompute valid checksum after patching.
- Implement freestanding HMAC-SHA256 for PIC blob (extract SHA-256 from shared lib inline functions)
- HMAC key: 32 bytes derived from build-time CSPRNG, stored in .pecker section
- Per-function expected MAC: HMAC-SHA256(key, bytecode_bytes), stored alongside bytecode
- Entry stub writes key + expected MAC into FlatVmContext
- Runtime: PIC interpreter computes MAC, compares against expected; on mismatch halt/corrupt

## Improvement 2: Comprehensive Breakpoint Scanning

Current scan only checks for 0xCC (INT3). Miss many variants.
- 0xCC: INT3 (software breakpoint)
- 0xCD 0x03: INT 3 (alternate encoding)
- 0x0F 0x0B: UD2 (used by some debuggers)
- 0xF1: ICEBP/INT1 (single-step trap)
- Hardware DR0-DR3: read via NtGetContextThread or inline assembly
- Check .pecker section for unexpected 0xCC at non-instruction-boundary offsets
- VEH-based single-step detection: install VEH, check if TRAP flag set unexpectedly

## Improvement 3: Continuous Checksumming in VM Dispatch Loop

Current checksum runs once at entry - does not detect runtime patching.
- Add to FlatVmContext: `uint8_t hmac_key[32]`, `uint8_t expected_mac[32]`, `uint32_t checksum_interval`, `uint32_t checksum_counter`
- Every N instructions (configurable, default 512): re-verify bytecode MAC
- Performance budget: SHA-256 of 4KB bytecode ? 1-2?s; at interval=512 ? 0.1% overhead
- On mismatch: silent corruption mode (corrupt IP/registers) or immediate halt
- Chained mode: add counter decrement + call to shared checksum routine in emitDispatchNext()

## FlatVmContext Impact

- New fields: hmac_key[32], expected_mac[32], checksum_interval(u32), checksum_counter(u32)
- Total: +72 bytes. Appended at end of struct (minimal offset disruption).
- Update CTX_SIZEOF and all downstream constants

## Key Files

- `include/PEcker/anti_analysis/self_checksum.h` - rewrite with HMAC + comprehensive scanning
- `include/PEcker/vm/vm_engine_flat.h` - freestanding SHA-256/HMAC, continuous checksum in dispatch loop
- `include/PEcker/stub/entry_stub.h` - CTX_SIZEOF, key+MAC copy into context
- `include/PEcker/commands/cmd_protect.h` - generate HMAC keys, compute expected MACs
- `include/PEcker/vm/chained_handlers.h` - checksum trampoline for chained dispatch

## Sub-tasks

- [x] Implement freestanding HMAC-SHA256 for PIC blob (extract SHA-256 from shared lib inline functions)
- [x] Generate 32-byte HMAC key via CSPRNG at build time; embed in .pecker section
- [x] Compute per-function expected MAC at build time: HMAC-SHA256(key, bytecode_bytes)
- [x] Add hmac_key[32], expected_mac[32], checksum_interval, checksum_counter to FlatVmContext
- [x] Update CTX_SIZEOF and all offset constants in entry_stub.h and chained_handlers.h
- [x] Entry stub copies HMAC key + expected MAC from section data into context
- [x] Add continuous checksum macro to flat VM dispatch loop (counter decrement + MAC verify)
- [x] Add FLAT_VM_STATUS_INTEGRITY_FAILED status code for checksum mismatch
- [x] Expand breakpoint scan: 0xCC, 0xCD03, 0x0F0B, 0xF1, hardware DR0-DR3
- [x] Add VEH-based single-step detection (check TRAP flag)
- [x] Add checksum trampoline stub for chained dispatch mode
- [x] Add --checksum-interval CLI flag; wire into --shizo/--weak presets
- [ ] Write HMAC-SHA256 test vectors (RFC 4231)
- [ ] Write breakpoint scan tests (detect all variant patterns)
- [ ] Write continuous checksum tests (mismatch detected mid-execution)
