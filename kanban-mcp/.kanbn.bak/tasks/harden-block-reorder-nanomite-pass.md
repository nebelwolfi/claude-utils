---
created: 2026-03-04T14:03:16.725Z
updated: 2026-03-12T01:25:28.987Z
started: 2026-03-10T17:34:33.134Z
tags:
  - hardening
  - nanomite
  - block-reorder
  - existing-pass
---

# Harden BlockReorder + NanomitePass

## Overview

Five improvements across BlockReorderPass and NanomitePass.

## BlockReorderPass Improvements



### 1. Merge with CFG Flatten

Reordered blocks use state-machine transitions instead of plain JMPs.
- Add `flatten_mode` flag to BlockReorderConfig
- When enabled, block transitions emit `MOV_RI state_reg, next_state; JMP dispatcher` instead of plain `JMP target`
- Requires coordination with CfgFlattenPass (shared state register, compatible state IDs)

### 2. Conditional Bogus Branches at Block Boundaries

- Insert runtime-resolved opaque predicates that look like real conditional branches
- Use patterns from DynamicOpaquePredicatePass (n*(n+1) parity test)
- Bogus branch targets point to junk blocks or other real blocks (confusing CFG reconstruction)

## NanomitePass Improvements



### 3. Encrypt Nanomite Table

Table entries are cleartext metadata with all trap IDs, conditions, and targets.
- Per-build 64-bit seed stored in FlatVmContext as `nanomite_table_seed`
- Each entry encrypted: XOR with FNV-1a(seed, trap_id)
- Runtime handler: derive key from seed+trap_id, XOR-decrypt entry fields
- Update all nanomite handlers: vm_engine_flat.h, vm_engine.h, chained_handlers.h

### 4. Obfuscate Condition Encoding

Don't store raw condition flags; encode as `condition ^ hash(trap_id)`.
- Decode at runtime: `real_condition = stored_condition ^ hash(trap_id)`
- Same hash function (FNV-1a) used for both encryption and condition obfuscation
- Zero additional storage; pure computation change

### 5. Indistinguishable Decoy Entries

Current decoys are unused trap_ids - trivially identifiable.
- Generate decoy entries with valid-looking conditions, plausible target offsets
- Decoy targets point within the bytecode (but to unreachable positions)
- Decoy trap_ids interspersed with real ones (no gaps)
- `num_decoy_nanomites` config field

## Key Files

- `include/PEcker/obfuscation/nanomite.h` - table encryption, condition obfuscation, decoys
- `include/PEcker/obfuscation/block_reorder.h` - flatten mode, bogus branches
- `include/PEcker/vm/vm_engine_flat.h` - runtime nanomite handler decrypt
- `include/PEcker/vm/chained_handlers.h` - chained nanomite handler
- `include/PEcker/stub/entry_stub.h` - CTX_SIZEOF for nanomite_table_seed

## Sub-tasks

- [x] Add flatten_mode to BlockReorderConfig; emit state-machine transitions instead of plain JMPs
- [x] Add conditional bogus branches at block boundaries using runtime opaque predicates
- [x] Add nanomite_table_seed (u64) to FlatVmContext; update CTX_SIZEOF and entry_stub.h offsets
- [x] Encrypt nanomite table entries: XOR with FNV-1a(seed, trap_id) at build time
- [x] Update flat VM nanomite handler: derive key and XOR-decrypt entry before use
- [x] Update C++ VM engine nanomite handler with decrypt-on-lookup
- [x] Update chained handlers nanomite: inline x86-64 FNV-1a key derivation + XOR decrypt
- [ ] Obfuscate condition encoding: store condition ^ hash(trap_id), decode at runtime
- [ ] Generate indistinguishable decoy nanomite entries with valid conditions and plausible targets
- [ ] Add num_decoy_nanomites config field
- [ ] Write encrypted nanomite table tests (correct execution after decrypt)
- [ ] Write condition obfuscation tests (all 9 condition types)
- [ ] Write decoy nanomite tests (correct execution, table size inflated)
