---
tags:
  - engine
  - tier-2
created: 2026-02-26T09:51:19.506Z
updated: 2026-03-03T00:29:01.532Z
started: 2026-02-26T14:19:39.434Z
completed: 2026-02-26T14:37:39.080Z
---

# SmartSelect: Call Graph Engine

Build full call graph from direct CALL targets (E8 rel32). Build RVA->index map for O(log n) target resolution. Propagate scores transitively. Detect critical path via BFS from entry point. Functions within call depth <=3 get bonus. Implemented in include/PEcker/analysis/callgraph_engine.h.

## Sub-tasks

- [x] Build caller/callee adjacency lists during single-pass phase
- [x] Build sorted RVA->function_index map
- [x] Implement score propagation (2 iterations)
- [x] Implement critical path BFS from entry point
- [x] Detect hot-path penalty: >20 call sites = -20
- [x] Handle large call graphs (5000+ functions)
- [x] Unit tests with synthetic call graphs
- [x] Detect return-value gate: function return controls branch to ExitProcess/abort/error path
- [x] Detect large-but-called-once: functions >500 insns with exactly 1 call site get positive signal instead of size penalty

## Relations

- [blocks smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
- [requires smart-select-scoring-model-design](smart-select-scoring-model-design.md)
