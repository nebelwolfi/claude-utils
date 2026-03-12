---
tags:
  - engine
  - anti-criteria
created: 2026-02-26T09:51:28.836Z
updated: 2026-03-03T11:21:44.105Z
started: 2026-02-26T15:21:27.104Z
completed: 2026-02-26T15:39:57.254Z
---

# SmartSelect: Auto-Exclude Matcher

Detect and auto-exclude compiler-generated functions, exception handlers, tiny thunks, and standard library wrappers. Reuses 3-tier exclusion from cmd_protect.h. Also excludes: <3 instruction functions, single-JMP thunks, all-NOP/INT3 padding. Applied as -100 penalty.

## Sub-tasks

- [x] Integrate isCrtExcluded() pattern into scoring pipeline
- [x] Add instruction count gate: <3 instructions = -100
- [x] Detect thunk functions: single JMP = auto-exclude
- [x] Detect padding: all NOPs or INT3 = auto-exclude
- [x] Unit tests for each exclusion pattern

## Relations

- [blocks smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
