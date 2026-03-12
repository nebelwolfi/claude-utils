---
tags:
  - core
  - orchestrator
created: 2026-02-26T09:51:22.916Z
updated: 2026-03-03T00:48:49.777Z
started: 2026-02-26T16:10:34.843Z
completed: 2026-02-26T16:25:23.262Z
---

# SmartSelect: Scoring and Ranking System

Orchestrator wiring all analysis engines together. Enumerates functions from PDB or export boundaries. Builds IAT map once. Runs single-pass per-function analysis (string+import+pattern combined). Builds call graph and propagates scores. Classifies into tiers (AutoSelect>=60, Suggest 30-59, Ignore<30). Sorts by score descending. Implemented in include/PEcker/analysis/smart_engine.h.

## Sub-tasks

- [x] Implement analyzeAll(pe, pdb, weights) -> SmartSelectResult
- [x] Enumerate functions from PDB or export boundaries
- [x] Build IAT map once, sort for binary search
- [x] Single-pass per-function: combine all engines in one instruction loop
- [x] Apply name-keyword scoring as fast path
- [x] Apply CRT auto-exclude with -100 penalty
- [x] Run call graph + score propagation as second phase
- [x] Classify tiers and sort by score
- [x] Integration tests on real PE

## Relations

- [blocks smart-select-cli-integration](smart-select-cli-integration.md)
- [blocks smart-select-gui-integration](smart-select-gui-integration.md)
