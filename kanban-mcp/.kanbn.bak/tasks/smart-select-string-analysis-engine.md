---
tags:
  - engine
  - tier-1
created: 2026-02-26T09:51:11.099Z
updated: 2026-03-03T13:16:57.557Z
started: 2026-02-26T11:01:46.423Z
completed: 2026-02-26T11:18:52.532Z
---

# SmartSelect: String Analysis Engine

Scan each function's disassembled code for LEA/MOV instructions with RIP-relative addressing. Resolve target VA to data sections (.rdata, .data). Read strings at resolved offsets. Match against KeywordDatabase. Score functions based on keyword category and match count. Cap at 25 points per function. Implemented in include/PEcker/analysis/string_engine.h.

## Sub-tasks

- [x] Implement analyzeStrings() - iterate instructions, find LEA/MOV RIP-relative
- [x] Resolve target VA via ripRelativeAddress(), check sectionForRva() is non-executable
- [x] Read string at target via readStringRva(), validate printable ASCII
- [x] Match string against KeywordDatabase, add ScoreEvidence per match
- [x] Cap total string engine contribution at 25 points
- [x] Also detect MOV BYTE [rsp+N], imm8 patterns (string obfuscation indicator)
- [x] Unit tests with synthetic code bytes containing LEA to known strings

## Relations

- [blocks smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
- [requires smart-select-keyword-dictionary](smart-select-keyword-dictionary.md)
