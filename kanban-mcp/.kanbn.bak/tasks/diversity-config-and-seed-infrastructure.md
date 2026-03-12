---
created: 2026-02-26T20:22:37.268Z
updated: 2026-03-02T11:28:38.444Z
started: 2026-02-27T20:11:02.066Z
completed: 2026-02-28T01:35:30.323Z
---

# Diversity: config and seed infrastructure

Create include/PEcker/obfuscation/diversity.h. DiversityConfig (master_seed, per-dimension toggles). DiversitySeedDeriver: handlerSeed(), blockReorderSeed(), encodingSeed(), entryStubSeed() via XOR with distinct magic constants. DiversityReport for debugging. CLI: --diversity flag.
