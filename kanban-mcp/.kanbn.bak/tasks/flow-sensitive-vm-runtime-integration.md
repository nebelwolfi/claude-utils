---
created: 2026-02-26T20:20:43.910Z
updated: 2026-02-26T23:47:29.470Z
started: 2026-02-26T23:37:07.373Z
completed: 2026-02-26T23:47:29.470Z
---

# FlowSensitive: VM runtime integration

Add chain_state (u64) and flow_key_table pointer to VmContext/FlatVmContext. In dispatch loop: after reading opcode, decrypt operand bytes using keystreamByte(chain_state, i), then evolve chain_state. On branches: look up targets chain_state from flow_key_table. Integrate into switch/computed-goto/threaded/flat/chained dispatch. Update entry_stub.h offsets.

## Relations

- [requires flow-sensitive-core-data-structures-and-key-derivation](flow-sensitive-core-data-structures-and-key-derivation.md)
