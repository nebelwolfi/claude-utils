---
tags:
  - enhancement
  - backlog
  - learning
created: 2026-02-26T10:00:49.300Z
updated: 2026-03-03T13:23:24.605Z
started: 2026-02-27T20:07:37.140Z
completed: 2026-02-28T01:19:47.943Z
---

# SmartSelect: Local Preference Learning

Learn from the user's manual function selections over time. When a user manually selects/deselects functions after smart-select runs, record the delta. Over multiple sessions, build a local preference model that adjusts scores based on patterns the user consistently favors or rejects. Stored in a local JSON file (e.g. .pecker/preferences.json). Not a full ML system - just weighted feature boosting based on historical accept/reject ratios per signal type.

## Sub-tasks

- [x] Define preference storage format (.pecker/preferences.json)
- [x] Track user accept/reject deltas after smart-select in protect flow
- [x] Compute per-ScoreReason accept/reject ratios from history
- [x] Apply learned weight adjustments as multipliers on SmartSelectWeights
- [x] Decay old preferences over time (exponential moving average)
- [x] CLI flag to reset/show learned preferences
- [x] Unit tests for preference accumulation and weight adjustment
