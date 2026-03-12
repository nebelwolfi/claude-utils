---
tags:
  - infrastructure
  - core
created: 2026-02-26T09:49:58.822Z
started: 2026-02-26T09:49:58.822Z
updated: 2026-03-03T00:38:28.448Z
completed: 2026-02-26T10:46:34.879Z
---

# SmartSelect: Scoring Model Design

Define the core data structures for the scoring system: FunctionScore (per-function score + evidence chain), ScoreEvidence (reason + points + detail string), ScoreReason enum, SmartSelectWeights (configurable per-reason weights), SelectionTier (AutoSelect/Suggest/Ignore), SmartSelectResult (sorted vector + tier counts). Implemented in include/PEcker/analysis/engine_types.h.

## Sub-tasks

- [x] Define ScoreReason enum (NameKeyword, StringReference, ImportApiCall, BooleanGate, ConstantComparison, CryptoLoop, HighArithDensity, ManyUniqueConstants, HighComplexity, CalledByHighScore, CriticalPath, penalties)
- [x] Define ScoreEvidence struct (reason, points, detail[128])
- [x] Define FunctionScore struct (rva, name, size, total_score, evidence[32], call graph adjacency)
- [x] Define SmartSelectWeights struct with default values matching the scoring table
- [x] Define SelectionTier enum and classifyScore() function
- [x] Define SmartSelectResult container
- [x] Unit tests for score computation and tier classification
