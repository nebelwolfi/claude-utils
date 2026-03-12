---
created: 2026-03-04T14:01:46.625Z
updated: 2026-03-04T14:01:46.625Z
priority: high
tags:
  - hardening
  - flow-encryption
  - existing-pass
---

# Harden FlowSensitiveEncryptionPass

## Overview
Three improvements to flow-sensitive encryption: encrypt opcode bytes, replace FNV-1a with SipHash PRF, and eliminate the FlowKeyTable from the binary.

## Improvement 1: Encrypt Opcode Bytes
Currently byte 0 (opcode) is left plaintext - attacker sees the instruction stream structure. Fix: extend XOR keystream to cover byte 0.
- Change `flowCryptInstruction()` loop from `i = 1` to `i = 0`
- At runtime: decrypt byte 0 first to recover opcode, then call instrSize(), then decrypt rest
- Update all 6 dispatch paths: vm_engine.h (switch, computed-goto, threaded) + vm_engine_flat.h (switch, FLAT_DISPATCH_NEXT, FLAT_THREAD_NEXT)
- Update `flat_flow_decrypt_instr()` to start at offset 0
- Update undo/redo loops in cmd_protect.h

## Improvement 2: Replace FNV-1a with SipHash-2-4
FNV-1a is non-cryptographic and invertible. SipHash-2-4 is a proper PRF.
- New file `include/PEcker/obfuscation/siphash.h`: ~40-50 lines of portable C++
- Widen chain_state from 64-bit to 128-bit (chain_state_lo + chain_state_hi)
- Replace mixChainState/keystreamByte with SipHash-based equivalents
- FlowKeyEntry gains second u64 field (24 bytes per entry)
- Add `uint64_t flow_chain_state_hi` to both VmContext and FlatVmContext
- Duplicate SipHash in `#ifdef FLAT_VM_FREESTANDING` block for PIC blob
- Update CTX_SIZEOF (+8 bytes)

## Improvement 3: Eliminate FlowKeyTable from Binary
The flow_key_table stores chain states for every instruction boundary - completely defeats path-dependent encryption.
- Per-function 128-bit root key `K_func` (random, stored in .pecker section)
- At block boundaries: `chain_state = SipHash(K_func, block_offset)` - derived, not stored
- Within blocks: chain evolves from instruction mixing (cascading property preserved)
- Remove flow_key_table pointer and count from FlatVmContext
- Add `uint8_t flow_func_key[16]` to FlatVmContext
- Entry stub embeds 16-byte func_key from section data
- Remove all flow_key_table serialization from cmd_protect.h
- On branch taken: VM derives target block's chain state from K_func + target offset

## Key Files
- `include/PEcker/obfuscation/flow_sensitive.h` - core encryption/decryption + chain state
- `include/PEcker/vm/vm_engine_flat.h` - PIC interpreter dispatch + flow decrypt
- `include/PEcker/vm/vm_engine.h` - C++ interpreter 3 dispatch modes
- `include/PEcker/stub/entry_stub.h` - field offsets + flow key init
- `include/PEcker/commands/cmd_protect.h` - section builder + undo/redo

## Implementation Order
1. Encrypt opcode bytes (smallest scope)
2. SipHash PRF (requires siphash.h + chain_state widening)
3. Eliminate FlowKeyTable (most invasive - context layout + section builder)

## Sub-tasks
- [ ] Change flowCryptInstruction() XOR loop from i=1 to i=0 (encrypt opcode byte)
- [ ] Update vm_engine.h switch dispatch: decrypt byte 0 before instrSize() when flow_decrypt_enabled
- [ ] Update vm_engine.h computed-goto DISPATCH_NEXT: decrypt opcode before dispatch
- [ ] Update vm_engine.h threaded THREAD_NEXT: decrypt opcode before dispatch
- [ ] Update vm_engine_flat.h switch dispatch: decrypt pc[0] before inverse_map lookup
- [ ] Update flat_flow_decrypt_instr() to start at offset 0
- [ ] Update FLAT_DISPATCH_NEXT and FLAT_THREAD_NEXT macros for opcode decryption
- [ ] Update cmd_protect.h undo/redo loops for encrypted opcode bytes
- [ ] Create `include/PEcker/obfuscation/siphash.h` with SipHash-2-4 implementation
- [ ] Widen chain_state to 128-bit: add chain_state_hi to FlowKeyEntry, VmContext, FlatVmContext
- [ ] Replace mixChainState/keystreamByte with SipHash-based equivalents in flow_sensitive.h
- [ ] Add freestanding SipHash in FLAT_VM_FREESTANDING block for PIC blob
- [ ] Update CTX_SIZEOF and entry_stub.h offsets for chain_state_hi (+8 bytes)
- [ ] Add flow_func_key[16] to FlatVmContext; remove flow_key_table pointer and flow_key_count
- [ ] Modify flow_sensitive.h apply() to derive chain states per-block from K_func instead of building table
- [ ] Add flat_derive_block_chain() in vm_engine_flat.h using SipHash on func_key + offset
- [ ] Replace all lookupFlowChainState() calls with derivation on branch-taken
- [ ] Entry stub embeds 16-byte func_key; LEA + MOVDQU into context
- [ ] Remove flow_key_table serialization from cmd_protect.h
- [ ] Write SipHash test vectors from official paper
- [ ] Write opcode encryption roundtrip + execution tests
- [ ] Write table-free execution tests (linear, loop, conditional branch programs)

