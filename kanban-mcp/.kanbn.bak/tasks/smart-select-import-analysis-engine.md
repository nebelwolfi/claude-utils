---
tags:
  - engine
  - tier-1
created: 2026-02-26T09:51:13.891Z
updated: 2026-03-03T00:23:23.942Z
started: 2026-02-26T11:21:40.967Z
completed: 2026-02-26T12:19:31.176Z
---

# SmartSelect: Import Analysis Engine

Build IAT address map from PE import table (reuse buildImportTable pattern from import_hide.h). For each function, scan for CALL [RIP+disp] (FF 15) and JMP [RIP+disp] (FF 25) patterns. Resolve target to IAT slot via binary search. Classify import by category. Score based on import category. Cap at 20 points. Implemented in include/PEcker/analysis/import_engine.h.

## Sub-tasks

- [x] Implement buildIatMap() - walk pe.imports + FirstThunk to build sorted entries
- [x] Implement analyzeImports() - scan for indirect CALL/JMP with RIP-relative
- [x] Binary search IAT map by slot_va for O(log n) lookup
- [x] Classify each resolved import via categorizeImport()
- [x] Add ScoreEvidence per categorized import call
- [x] Cap total import engine contribution at 20 points
- [x] Unit tests with synthetic IAT entries and CALL [RIP+disp] patterns

## Relations

- [blocks smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
- [requires smart-select-import-category-database](smart-select-import-category-database.md)
