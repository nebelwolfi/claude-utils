---
created: 2026-03-11T22:54:20.988Z
updated: 2026-03-11T22:54:20.989Z
priority: low
tags:
  - lifter
  - recursive
  - multi-function
---

# Lifter: multi-function recursive call support

4 golden rule test failures in `recursive` corpus. Multiple recursive functions fail after the first one succeeds. Likely a state management issue between protected recursive calls.
