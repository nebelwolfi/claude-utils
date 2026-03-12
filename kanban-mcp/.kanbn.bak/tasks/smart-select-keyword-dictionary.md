---
tags:
  - infrastructure
  - tier-1
created: 2026-02-26T09:49:46.448Z
started: 2026-02-26T09:49:46.449Z
updated: 2026-03-03T00:32:26.726Z
completed: 2026-02-26T10:31:18.838Z
---

# SmartSelect: Keyword Dictionary

Define KeywordCategory enum and static keyword tables for crypto/license/DRM/anti-tamper/network/HWID categories. Each category has a list of case-insensitive substrings and a configurable weight. Implemented in include/PEcker/analysis/keywords.h.

## Sub-tasks

- [x] Define KeywordCategory enum (Crypto, License, DRM, AntiTamper, Network, HWID, ErrorString)
- [x] Build static keyword tables per category with 10-15 keywords each
- [x] Implement KeywordDatabase::matchString() using containsSubstrCI pattern
- [x] Support extra_keywords from JSON config for user extensibility
- [x] Unit tests for keyword matching (case insensitivity, partial match, category classification)
