---
created: 2026-03-07T12:42:18.414Z
updated: 2026-03-07T21:28:52.564Z
started: 2026-03-07T13:35:19.563Z
completed: 2026-03-07T21:28:52.564Z
---

# Split/Fragmented Entry Stubs

Break monolithic entry stubs (~130-300 bytes) into 3-5 fragments scattered across the .pecker section, connected by JMP rel32 chains. Each fragment looks like a normal function piece, defeating contiguous pattern matching.

**Fragment boundaries** (5 natural split points):
1. After callee-save pushes (prolog fragment)
2. After stack probe + zero-init
3. After arg copies + context field setup
4. After interpreter call (return extraction)
5. Epilogue (pops + RET)

**Fragment placement**: Interleave fragments from different stubs in the section. Stub A fragment 2 sits between Stub B fragments 1 and 3.

**.pdata handling**: Use UNW_FLAG_CHAININFO - each non-prolog fragment gets a chained UNWIND_INFO referencing the prolog fragment's RUNTIME_FUNCTION. ExceptionDirBuilder needs `chained_parent_rva` support.

**Fixup adjustment**: RIP-relative LEAs in each fragment must be recomputed for the fragment's actual position. The section builder patches displacements per-fragment.

**Decoy fragments**: Optionally insert unreachable fake fragments between real ones. Same structure, different content.

**Key files**: entry_stub.h (StubFragment/FragmentedEntryStub structs), cmd_protect.h (fragment interleaving + .pdata chaining), exception_dir.h (UNW_FLAG_CHAININFO support), config.h

## Sub-tasks

- [x] Define StubFragment and FragmentedEntryStub structs in entry_stub.h
- [x] Identify and implement 5 fragment boundary points in generateEntryStub()
- [x] Emit JMP rel32 (5 bytes) at each fragment boundary
- [x] Implement fragment interleaving strategy in buildPeckerSectionV2()
- [x] Add UNW_FLAG_CHAININFO support to ExceptionDirBuilder in exception_dir.h
- [x] Generate chained UNWIND_INFO entries for non-prolog fragments
- [x] Adjust RIP-relative LEA fixups per fragment's actual section position
- [x] Implement decoy fragment generation (optional unreachable fragments)
- [x] Add fragment_stubs, fragment_count, decoy_fragment_count to PeckerConfig
- [x] Wire CLI flags and config
- [x] Write test: fragment count matches config
- [x] Write test: JMP instructions at fragment boundaries
- [x] Write test: fixup offsets valid per fragment
- [x] Write test: chained unwind info correctness
- [x] Write test: HDE64-decodable across all fragments
