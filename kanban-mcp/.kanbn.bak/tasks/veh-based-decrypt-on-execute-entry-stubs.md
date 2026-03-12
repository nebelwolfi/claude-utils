---
created: 2026-03-04T18:03:38.424Z
updated: 2026-03-06T18:17:56.807Z
started: 2026-03-06T14:49:07.340Z
completed: 2026-03-06T18:17:02.322Z
tags:
  - entry-stub
  - anti-analysis
  - VEH
  - memory-protection
---

# VEH-Based Decrypt-on-Execute Entry Stubs

Mark entry stub pages PAGE_NOACCESS. A Vectored Exception Handler decrypts the faulting page on demand, re-encrypts after all threads leave. Sliding window ensures only N pages are decrypted simultaneously.

**Data structures**:
- `StubPageDescriptor` (64 bytes): page_va, page_size, volatile state (Encrypted/Decrypting/Decrypted/ReEncrypting), key[16], nonce[16], volatile ref_count
- `DecryptOnExecuteHeader` (32 bytes): magic, page_count, max_decrypted, veh_handle, flags

**VEH handler logic**:
1. Catch STATUS_ACCESS_VIOLATION (access_type == 8 for execute, also 0 for read/.pdata)
2. Look up faulting address in descriptor table
3. CAS Encrypted→Decrypting: winner decrypts (VirtualProtect RW → XOR-rotate decrypt → VirtualProtect RX)
4. CAS losers spin-wait on state until Decrypted
5. LOCK INC ref_count, return EXCEPTION_CONTINUE_EXECUTION
6. Evict excess pages: when decrypted_count > max_decrypted, re-encrypt pages with ref_count==0

**Ref_count decrement**: Entry stub epilogue emits ~40 bytes to LEA own RIP, mask to page, walk descriptor table, LOCK DEC ref_count.

**Loader stub integration**: Resolves AddVectoredExceptionHandler via PEB walk, registers VEH, loops over descriptors calling VirtualProtect(PAGE_NOACCESS).

**.pdata compatibility**: UNWIND_INFO lives in xdata area (separate from stub pages). VEH handles read faults too (for unwinder accessing stub pages).

**Scope**: Only .pecker section stubs (not inlined .text stubs).

**Key files**: new decrypt_on_execute.h, entry_stub.h (epilogue ref_count), cmd_protect.h (pipeline), loader_stub.h (VEH registration)

## Sub-tasks

- [x] Create decrypt_on_execute.h with StubPageState enum, StubPageDescriptor, DecryptOnExecuteHeader structs
- [x] Implement computeStubPages(): map stub offsets/sizes to 4KB page descriptors
- [x] Implement buildDecryptOnExecuteTable(): serialize header + descriptors to bytes
- [x] Implement encryptStubPagesInSection(): XOR-rotate encrypt each page with per-page key
- [x] Implement stubDecryptVehHandler() with CAS state machine (Encrypted→Decrypting→Decrypted)
- [x] Implement findDescriptorForAddress(): binary/linear search of descriptor table
- [x] Implement evictExcessPages(): sliding window re-encryption of idle pages
- [x] Handle both execute faults (type==8) and read faults (type==0) for .pdata compatibility
- [x] Add doe_table_lea_fixup to EntryStub and ChainedEntryStub structs
- [x] Emit ref_count decrement epilogue (~40 bytes) in generateEntryStub when has_doe=true
- [x] Emit ref_count decrement epilogue in generateChainedEntryStub
- [x] Add decrypt_on_execute and doe_max_decrypted to PeckerConfig
- [x] Wire --decrypt-on-execute and --doe-max-pages CLI flags
- [x] Integrate DOE table construction into buildPeckerSectionV2 pipeline
- [x] Apply stub page encryption AFTER all fixups in cmd_protect.h
- [x] Extend loader stub with VEH registration phase (PEB walk → AddVectoredExceptionHandler)
- [x] Extend loader stub with PAGE_NOACCESS initialization loop
- [x] Ensure VEH handler code is NOT in an encrypted page
- [x] Exclude inlined stubs from DOE (only .pecker section)
- [x] Write test: struct layout (sizeof, offsets)
- [x] Write test: computeStubPages with various layouts and page-spanning stubs
- [x] Write test: encryption roundtrip (encrypt + decrypt = original)
- [x] Write test: VEH handler with VirtualAlloc'd test pages
- [x] Write test: sliding window eviction correctness
- [x] Write test: multi-threaded concurrent stub access
