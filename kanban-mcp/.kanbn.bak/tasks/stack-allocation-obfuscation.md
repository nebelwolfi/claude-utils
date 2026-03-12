---
created: 2026-03-04T18:04:53.065Z
updated: 2026-03-06T13:46:48.953Z
started: 2026-03-06T11:27:53.597Z
completed: 2026-03-06T13:45:53.192Z
tags:
  - entry-stub
  - anti-pattern-matching
  - MBA
---

# Stack Allocation Obfuscation

Obfuscate the distinctive stack probe loop and allocation pattern. Currently `SUB RSP, 4096` (exact constant) + `MOV BYTE [RSP], 0` + `DEC EAX; JNZ` with fixed NUM_PAGES and REMAINDER values are trivially signaturable.

**3 Strategies** (selected per-stub via diversity_seed):

0. **Split-SUB with Junk**: Split each `SUB RSP, 4096` into 2-3 smaller SUBs (e.g., `SUB RSP, 2048; junk; SUB RSP, 2048`) with NOP-equivalent junk between them. Remainder SUB similarly split. Pool of junk: NOP, XCHG RAX,RAX, LEA RAX,[RAX+0], multi-byte NOPs.

1. **Register-Indirect MBA**: Compute page size (4096) via MBA in a register (`MOV EAX, K1; XOR EAX, K2; ADD EAX, K3` where result=4096), then `SUB RSP, RAX` in loop. Constants vary per stub - literal 0x1000 never appears.

2. **Unrolled Sub-Page Probes**: Instead of 1 probe per 4096-byte page, do 2 or 4 sub-page probes (e.g., 2x2048). Write-probe instruction varies: `MOV BYTE [RSP], 0` / `OR BYTE [RSP], 0` / `AND BYTE [RSP], 0xFF`.

**Epilogue obfuscation**: `ADD RSP, STACK_ALLOC` also obfuscated via MBA (register-indirect restore).

**Constraints**: Must probe every page (kernel guard page mechanism). Total allocation must equal STACK_ALLOC exactly for .pdata UWOP_ALLOC_LARGE. RSP 16-byte alignment maintained. Only RAX clobbered (R10/R11 hold saved args).

**Key files**: entry_stub.h (stack_alloc_obfuscation namespace), config.h (obfuscate_stack_alloc flag), cmd_protect.h (pass flag + read stack_alloc from stub result)

## Sub-tasks

- [x] Add stack_alloc field to EntryStub struct (set to STACK_ALLOC, future-proofs variable padding)
- [x] Update cmd_protect.h to read stack_alloc from stub result instead of compile-time constant
- [x] Create stack_alloc_obfuscation namespace in entry_stub.h
- [x] Implement emitJunk(): NOP-equivalent dead instructions from junk pool using RAX
- [x] Implement emitWriteProbe(): randomly select MOV BYTE/OR BYTE/AND BYTE [RSP] variants
- [x] Implement emitMbaImm32IntoEax(): MBA expression computing constant into EAX (ADD/XOR/SUB splits)
- [x] Implement emitSplitSubProbeLoop() - Strategy 0: split SUBs with interleaved junk
- [x] Implement emitMbaProbeLoop() - Strategy 1: MBA-computed page size in register
- [x] Implement emitUnrolledProbeLoop() - Strategy 2: sub-page probes with variable probe instructions
- [x] Implement emitObfuscatedProbeLoop() dispatcher selecting strategy from seed
- [x] Implement emitObfuscatedStackRestore() for epilogue ADD RSP obfuscation
- [x] Add obfuscate_stack_alloc flag to PeckerConfig + CLI parsing
- [x] Replace hardcoded probe loop in generateEntryStub() with obfuscated dispatcher
- [x] Replace hardcoded probe loop in generateChainedEntryStub()
- [x] Add to --shizo preset
- [x] Write test: obfuscated stub lacks literal SUB RSP, 4096 pattern
- [x] Write test: total allocation preserved (epilogue ADD RSP matches)
- [x] Write test: deterministic output for same seed
- [x] Write test: different seeds produce different probe loops
- [x] Write test: all strategies HDE64-decodable
- [x] Write test: MBA strategy has no literal 0x00001000 in code
- [x] Write test: in-process execution correctness with obfuscated stack alloc
