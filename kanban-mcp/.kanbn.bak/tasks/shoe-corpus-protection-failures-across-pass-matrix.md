---
created: 2026-03-11T22:54:38.654Z
updated: 2026-03-11T22:54:38.654Z
priority: low
tags:
  - bug
  - shoe-corpus
  - bin2bin
  - complex-binary
---

# Shoe corpus: protection failures across pass matrix

24 test failures in shoe corpus:
- `shoe_e2e` (4 failures + timeouts): `file_write_cb` in computed_goto/threaded modes
- `shoe_flag_matrix` (20 failures): containers/crypto/vdispatch/stress all fail across individual passes (junk, mutate, encrypt, flatten, all_passes)

These are complex shared library binaries that likely hit unsupported x86 patterns and pass interaction bugs.
