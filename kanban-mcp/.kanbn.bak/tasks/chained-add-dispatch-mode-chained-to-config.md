---
created: 2026-02-26T22:00:00.000Z
updated: 2026-03-03T15:36:40.681Z
started: 2026-02-26T22:30:00.000Z
completed: 2026-02-26T23:00:00.000Z
tags:
  - config
  - chained
---

# Chained: Add DispatchMode::Chained to config

Add `Chained` (value 3) to the `DispatchMode` enum. Update name/parse functions, help text, and CLI docs.

## Sub-tasks

- [x] Add `Chained` to `DispatchMode` enum in `include/PEcker/common/config.h`
- [x] Update `dispatchModeName()` to return `"chained"`
- [x] Update `parseDispatchMode()` to accept `"chained"`
- [x] Update `help.h` dispatch flag docs to list `chained` (uses dispatchModeName() dynamically)
- [x] Update `CLI.md` dispatch section
- [x] Verify existing config_loader.h and args.h work with new mode (92 CLI + 61 config_loader tests pass)
