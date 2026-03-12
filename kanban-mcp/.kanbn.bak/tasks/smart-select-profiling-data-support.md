---
tags:
  - enhancement
  - backlog
created: 2026-02-26T09:52:20.256Z
updated: 2026-03-03T00:29:32.264Z
started: 2026-02-26T17:30:24.786Z
completed: 2026-02-26T20:45:42.014Z
---

# SmartSelect: Profiling Data Support

Accept --profile flag with performance profiling data to penalize hot-path functions. Parse profiling data (call counts per function). Functions called >1000 times get -20, >10000 times get -40. Integrates with the scoring system as an additional penalty source.

## Sub-tasks

- [x] Define profiling data format (CSV: function_name, call_count)
- [x] Implement profile data parser
- [x] Integrate call frequency penalties into scoring pipeline
- [x] Add --profile flag to CLI
- [x] Unit tests
