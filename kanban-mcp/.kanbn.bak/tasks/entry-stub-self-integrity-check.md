---
created: 2026-03-04T18:16:01.787Z
updated: 2026-03-04T18:16:01.787Z
priority: high
tags:
  - entry-stub
  - anti-tampering
  - integrity
---

# Entry Stub Self-Integrity Check

Before executing the main body, the entry stub computes a XOR-ROL-fold hash over its own code bytes and compares against an embedded expected value. Detects breakpoints (0xCC), patches, and binary modification.

**Hash algorithm**: XOR-ROL-fold (2 instructions/byte: `XOR EAX, byte; ROL EAX, 7`). 32-bit accumulator. ~2-3 cycles/byte. For ~400-byte stub: ~1000-2000 cycles (< 1 microsecond).

**Sentinel approach**: 4-byte expected hash embedded at known offset. Hash loop skips these 4 bytes (CMP index, sentinel_offset → ADD index, 4 → JMP loop_cmp). Expected hash patched by section builder AFTER all fixups.

**Detection response**: Silent context corruption - XOR R10/R11 (saved RCX/RDX args) with computed hash. VM receives garbage arg values → subtly wrong results, extremely hard to trace back to integrity check.

**Register safety**: Uses RDI (stub base), ESI (size), EAX (accumulator), ECX (index), EDX (byte). R8/R9 saved to context scratch space and restored after.

**Injection point**: After zero-init, before arg copies (after prolog_size - .pdata safe). Block size: ~97 bytes.

**Post-fixup hash computation**: In cmd_protect.h, after all RIP-relative fixups are patched, compute XOR-ROL-fold hash per stub (skipping sentinel bytes) and patch sentinel with expected value.

**Key files**: entry_stub.h (emitIntegrityCheck + IntegrityCheckInfo struct), cmd_protect.h (post-fixup hash pass), config.h (stub_integrity flag)

## Sub-tasks
- [ ] Implement emitIntegrityCheck() in stub_detail returning IntegrityCheckInfo
- [ ] Emit R8/R9 save to context scratch space (16 bytes)
- [ ] Emit LEA RDI, [RIP-offset] for stub base address resolution
- [ ] Emit hash loop: XOR-ROL-fold with sentinel skip (CMP+JNE+ADD+JMP structure)
- [ ] Emit detection response: XOR R10/R11 with hash (corrupt saved args)
- [ ] Emit R8/R9 restore from context scratch space
- [ ] Add integrity_sentinel_fixup and integrity_size_fixup fields to EntryStub struct
- [ ] Add stub_integrity parameter to generateEntryStub()
- [ ] Inject integrity check block after zero-init, before arg copies
- [ ] Apply same changes to generateChainedEntryStub()
- [ ] Implement post-fixup hash computation pass in cmd_protect.h
- [ ] Patch stub_size imm32 placeholder after stub generation completes
- [ ] Compute XOR-ROL-fold hash (skipping sentinel bytes) and patch sentinel
- [ ] Add stub_integrity flag to PeckerConfig + CLI parsing
- [ ] Add to --shizo preset
- [ ] Write test: hash matches sentinel for clean stub
- [ ] Write test: 0xCC patch detected (hash mismatch)
- [ ] Write test: single bit flip detected
- [ ] Write test: sentinel bytes excluded from hash
- [ ] Write test: register preservation (R8/R9/R10/R11 correct on clean path)

