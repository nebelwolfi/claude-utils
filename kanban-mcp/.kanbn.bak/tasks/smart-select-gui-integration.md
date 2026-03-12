---
tags:
  - gui
  - integration
created: 2026-02-26T09:52:18.535Z
updated: 2026-03-03T01:21:46.460Z
started: 2026-02-26T21:46:00.595Z
completed: 2026-02-26T22:47:32.275Z
---

# SmartSelect: GUI Integration

Add smart score visualization to the Function Selection panel. Color-coded score badges (green>=60, yellow 30-59, gray<30). Threshold slider (0-100 float) for live tier reclassification. Why? popover showing evidence breakdown per function. Sort-by-score column. Smart Analyze button triggers analysis::analyzeAll(). Add smart_score/smart_tier fields to SelectableFunction.

## Sub-tasks

- [x] Add float smart_score and u8 smart_tier to SelectableFunction
- [x] Smart Analyze button triggers analyzeAll() and populates fields
- [x] Color-coded score badges in function list
- [x] Threshold slider (0-100) with live tier reclassification
- [x] Why? popover showing evidence array
- [x] Sort-by-score column header
- [x] GUI tests for score display and interaction

## Relations

- [requires smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
