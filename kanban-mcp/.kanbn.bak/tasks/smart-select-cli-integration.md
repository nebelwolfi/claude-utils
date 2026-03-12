---
tags:
  - cli
  - integration
created: 2026-02-26T09:51:26.604Z
updated: 2026-03-03T13:13:16.628Z
started: 2026-02-26T16:32:59.062Z
completed: 2026-02-26T16:51:33.664Z
---

# SmartSelect: CLI Integration

Add smart-select subcommand to PEcker CLI. New Action::SmartSelect in config.h. Parse --threshold, --explain, --json, --apply flags. Implement cmd_smart_select.h with table/explain/JSON output. Wire into pecker protect --smart. Update help text and config_loader.

## Sub-tasks

- [x] Add Action::SmartSelect to config.h
- [x] Add smart config fields to PeckerConfig
- [x] Add smart-select to tryParseSubcommand()
- [x] Implement parseSmartSelectFlags()
- [x] Implement cmd_smart_select.h with table/explain/JSON output
- [x] Wire into cmd_protect.h::selectTargets()
- [x] Add to dispatch.h
- [x] Update help.h
- [x] Add JSON config loading in config_loader.h
- [x] CLI tests

## Relations

- [requires smart-select-scoring-and-ranking-system](smart-select-scoring-and-ranking-system.md)
