---
created: 2026-02-26T20:22:26.700Z
updated: 2026-03-02T17:38:23.719Z
started: 2026-02-27T20:09:38.596Z
completed: 2026-02-28T01:48:17.316Z
---

# Stolen bytes: pipeline integration

In cmd_protect.h: analyze each target after selection. Append trampolines to .pecker section. Patch JMP back fixups with final VA. Modify original-site patching: JMP to trampoline at entry, entry stub at entry+steal_length. Handle both inline and JMP-trampoline modes.

## Relations

- [requires stolen-bytes-trampoline-builder](stolen-bytes-trampoline-builder.md)
- [requires stolen-bytes-cli-and-config](stolen-bytes-cli-and-config.md)
