---
tags:
  - engine
  - tier-1
  - tier-2
created: 2026-02-26T09:51:17.999Z
updated: 2026-03-03T00:32:00.745Z
started: 2026-02-26T12:29:04.635Z
completed: 2026-02-26T12:56:47.129Z
---

# SmartSelect: Pattern Analysis Engine

Single-pass instruction metrics collection and pattern classification. Detects: boolean gate functions (return 0/1, <=64 bytes, single branch), constant-comparison patterns (CMP imm32 + Jcc), crypto loops (backward jump + XOR + shift/rotate), arithmetic density (>40% ALU ops), many unique constants (>16 distinct imm32 = S-box), SIMD/AVX presence (penalty). Extracts computeFunctionComplexity() from function_selection_panel.h. Implemented in include/PEcker/analysis/pattern_engine.h.

## Sub-tasks

- [x] Define PatternMetrics struct
- [x] Implement boolean gate detection
- [x] Implement constant-comparison pattern
- [x] Implement crypto loop detection
- [x] Implement arithmetic density scoring
- [x] Implement unique constant tracking
- [x] Implement SIMD/AVX penalty
- [x] Extract computeFunctionComplexity() into shared utility
- [x] Unit tests for each pattern
- [x] Detect recursive functions (function contains CALL to its own RVA)

## Relations

- [blocks smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
- [requires smart-select-scoring-model-design](smart-select-scoring-model-design.md)
