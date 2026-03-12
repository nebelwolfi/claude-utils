---
created: 2026-03-04T18:15:41.737Z
updated: 2026-03-04T18:15:41.737Z
tags:
  - entry-stub
  - anti-static-analysis
  - encryption
---

# Encrypted RIP-Relative Displacements

XOR-encrypt fixup displacements in RIP-relative LEAs with per-stub keys. Hides cross-references to bytecode, interpreter, encryption keys, etc. from static analysis.

**Problem**: x86-64 `LEA reg, [RIP+disp32]` only supports immediate displacement, not `[RIP+reg]`. Can't just encrypt the disp32 in-place.

**Approach**: Replace each `LEA reg, [RIP+disp32]` (7 bytes) with:
```
LEA reg, [RIP+0]           ; 7 bytes - capture current RIP neighborhood
MOV scratch, encrypted_d    ; 5 bytes - load encrypted displacement
XOR scratch, per_stub_key   ; 6 bytes - decrypt
ADD reg, scratch             ; 3 bytes - compute target address
```
Total: ~21 bytes per fixup (vs 7 original). Per-stub XOR key varies. Section builder patches `encrypted_d = real_disp ^ key`.

**Fixup model change**: Each LEA fixup now has two patch targets: the `encrypted_d` imm32 and the `per_stub_key` imm32. New `patchEncryptedDisp32()` replaces `patchStubDisp32()` when feature is active.

**7 fixup sites affected**: bytecode, interpreter, inverse_map, encryption_key, nanomite_table, flow_key_table, wb_tables.

**Per-stub key**: Derived from `diversity_seed ^ stub_index ^ magic`.

**Key files**: entry_stub.h (emitEncryptedRipLoad helper, rip_xor_key field), cmd_protect.h (patchEncryptedDisp32 in both section fixup path and inline path), config.h

## Sub-tasks
- [ ] Implement emitEncryptedRipLoad() helper in stub_detail (LEA [RIP+0] + MOV + XOR + ADD)
- [ ] Add rip_xor_key field to EntryStub and ChainedEntryStub structs
- [ ] Extend fixup tracking: each LEA fixup now records encrypted_disp offset + key offset
- [ ] Implement patchEncryptedDisp32(): encrypts real displacement with per-stub key
- [ ] Derive per-stub XOR key from diversity_seed in generateEntryStub()
- [ ] Replace all 7 LEA [RIP+disp] emissions with conditional encrypted variant
- [ ] Update buildPeckerSectionV2() section fixup loop to use patchEncryptedDisp32()
- [ ] Update inline fixup patching path in cmd_protect.h
- [ ] Apply same changes to generateChainedEntryStub()
- [ ] Add encrypt_rip_displacements flag to PeckerConfig + CLI
- [ ] Add to --shizo preset
- [ ] Write test: encrypted stub larger than plain (21 vs 7 bytes per LEA)
- [ ] Write test: fixup offsets valid in encrypted mode
- [ ] Write test: round-trip: encrypt then decrypt produces correct target address
- [ ] Write test: per-stub key uniqueness
- [ ] Write test: in-process execution correctness

