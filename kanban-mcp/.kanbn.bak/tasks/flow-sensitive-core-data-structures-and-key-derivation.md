---
created: 2026-02-26T20:20:37.498Z
updated: 2026-02-26T23:27:06.868Z
started: 2026-02-26T23:19:29.641Z
completed: 2026-02-26T23:27:06.868Z
---

# FlowSensitive: core data structures and key derivation

Create include/PEcker/obfuscation/flow_sensitive.h. Define FlowKeyEntry (bytecode_offset, chain_state), mixChainState() FNV-1a-style mixer, keystreamByte(chain_state, byte_index), flowDecryptInstruction(). Add flow_key_table to BytecodeProgram in bytecode.h.
