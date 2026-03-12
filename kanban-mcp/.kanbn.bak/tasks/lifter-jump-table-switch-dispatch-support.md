---
created: 2026-03-11T22:54:27.664Z
updated: 2026-03-11T22:54:27.664Z
tags:
  - lifter
  - switch
  - jump-table
  - new-instruction
---

# Lifter: jump table / switch dispatch support

1 golden rule test failure in `switch_table` corpus (0xC000001D = illegal instruction). Jump table dispatching (`jmp [base + reg*8]`) needs lifting support.
