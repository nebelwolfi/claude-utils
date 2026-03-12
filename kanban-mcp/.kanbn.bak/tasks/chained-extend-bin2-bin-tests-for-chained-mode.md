---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T17:26:21.195Z
started: 2026-03-03T16:59:10.996Z
completed: 2026-03-03T17:25:24.419Z
tags:
  - tests
  - integration
  - chained
---

# Chained: Extend BIN2BIN tests for chained mode

Add `_chained` variant to BIN2BIN_TEST macro so all existing corpus tests automatically run with chained dispatch.

## Sub-tasks

- [x] Extend `BIN2BIN_TEST` macro in `tests/test_helpers.h` to generate 4th variant `name##_chained` with `DispatchMode::Chained`
- [x] Build and run existing bin2bin tests - all `_chained` variants should pass
- [x] Fix any failures in chained mode (golden rule: native output == protected output)
- [x] Verify selective protection tests work with chained mode
- [x] Verify encryption + mutation + chained combination works
