---
created: 2026-03-03T19:56:07.780Z
updated: 2026-03-03T23:05:19.465Z
started: 2026-03-03T23:00:35.017Z
completed: 2026-03-03T23:04:45.210Z
priority: high
tags:
  - mba
  - tests
  - verification
---

# MBA: Build and run full test suite

Build and run the complete test suite to verify all changes.

```bash



cmake --build cmake-build-debug --target PEcker_tests



cmake-build-debug\PEcker_tests.exe --filter mba.



cmake-build-debug\PEcker_tests.exe







cmake-build-debug\PEcker_tests.exe --filter obfusc.
cmake-build-debug\PEcker_tests.exe --filter pass_combination.
cmake-build-debug\PEcker_tests.exe --filter binary_size.
cmake-build-debug\PEcker_tests.exe --filter anti_taint.
```

All 909+ existing tests must pass. New MBA tests must pass.

**Files:** None (build + test only)

## Sub-tasks

- [x] Build PEcker_tests
- [x] Run MBA-specific tests
- [x] Run full test suite
- [x] Run related test suites (obfusc, pass_combination, binary_size, anti_taint)

## Relations

- [requires mba-new-tests-for-strengthened-pass](mba-new-tests-for-strengthened-pass.md)
- [requires mba-project-file-persistence-for-mba-noise](mba-project-file-persistence-for-mba-noise.md)
- [requires mba-gui-noise-slider](mba-gui-noise-slider.md)
