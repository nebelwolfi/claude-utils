---
created: 2026-02-26T20:20:40.828Z
updated: 2026-03-02T03:34:16.890Z
started: 2026-02-26T23:28:31.292Z
completed: 2026-02-26T23:35:55.949Z
---

# FlowSensitive: build-time encryption pass

FlowSensitiveEncryptionPass in flow_sensitive.h. Performs basic block analysis (reuse identifyBlocks pattern), linear walk computing chain_state at each instruction, builds flow_key_table for all branch targets. Encrypts operand bytes (skips opcode byte). Runs last in pipeline (after mutate), mutually exclusive with existing EncryptionPass.

## Relations

- [requires flow-sensitive-core-data-structures-and-key-derivation](flow-sensitive-core-data-structures-and-key-derivation.md)
