---
tags:
  - config
  - backlog
created: 2026-02-26T09:52:24.158Z
updated: 2026-03-03T11:19:25.795Z
started: 2026-02-26T17:06:15.080Z
completed: 2026-02-26T17:21:29.697Z
---

# SmartSelect: JSON Weight Config

Load custom weights, thresholds, and extra keywords from pecker.json smart_select section. Uses existing mjson parser. Supports: threshold overrides, per-reason weight overrides, extra keyword lists per category. Falls back to SmartSelectWeights defaults.

## Sub-tasks

- [x] Define JSON schema for smart_select config section
- [x] Implement loadSmartSelectConfig() using mjson
- [x] Merge JSON weights with defaults
- [x] Parse extra_keywords arrays
- [x] Add --weights flag to CLI
- [x] Unit tests
