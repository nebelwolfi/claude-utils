---
created: 2026-03-04T14:02:07.443Z
updated: 2026-03-04T14:02:07.444Z
tags:
  - hardening
  - string-encryption
  - existing-pass
---

# Harden StringEncryptPass

## Overview
Three improvements: encrypt the stub table itself, lazy per-string decryption, and re-encrypt strings after use.

## Prerequisite: Basic Integration
String encryption is NOT yet integrated into cmd_protect.h pipeline. Must integrate first: call scanStrings(), encryptStrings(), embed DecryptionStubTable in .pecker section.

## Improvement 1: Nested Table Encryption
The DecryptionStubTable (magic, key, per-string entries) is cleartext metadata.
- New `EncryptedStubTableWrapper` struct with EDST magic, outer key, encrypted inner blob
- `encryptStubTable()`: serialize table → encrypt with separate key → wrap
- Loader stub Step 6b: decrypt wrapper in-place before string decryption
- Add `--no-encrypt-table` flag for debugging

## Improvement 2: Lazy Per-String Decryption
Instead of bulk decryptAllFromTable at startup, decrypt each string on first access.
- Extended `DecryptionStubEntryV2` with DECRYPTED_FLAG bit and access_count
- `stringAccessThunk()`: native function called via VM_NATIVE_CALL, performs lazy decrypt + VirtualProtect
- Lifter integration: at LEA/MOV referencing encrypted string, emit thunk call instead of plain MOV_RI
- Loader stub skips bulk decrypt when lazy mode active
- Hybrid: non-virtualized function strings decrypted at loader time (fallback)

## Improvement 3: Re-Encrypt After Use
Decrypt → use → zero → restore original ciphertext.
- `DecryptionStubEntryV3` with backup_offset pointing to original ciphertext copy in .pecker section
- `stringReleaseThunk()`: decrement access_count, if zero memcpy ciphertext backup + clear DECRYPTED_FLAG
- Lifter emits release thunks at every VM_RET for functions with string references
- VirtualProtect round-trip for .rdata strings (read-only sections)

## Key Files
- `include/PEcker/obfuscation/string_encrypt.h` - all 3 improvements center here
- `include/PEcker/commands/cmd_protect.h` - pipeline integration + section layout
- `include/PEcker/lifter/x86_lifter.h` - lazy access/release thunk emission
- `include/PEcker/loader/loader_stub.h` - table decrypt step + VirtualProtect

## Implementation Order
1. Integrate basic string encryption into cmd_protect.h
2. Nested table encryption
3. Lazy per-string decryption (changes table entry format)
4. Re-encrypt after use (extends thunk + entry format)

## Sub-tasks
- [ ] Integrate basic string encryption pipeline into cmd_protect.h runProtect()
- [ ] Add EncryptedStubTableWrapper struct with serialize/deserialize and outer encryption
- [ ] Add encryptStubTable() and decryptStubTable() functions
- [ ] Add loader stub Step 6b: decrypt string table wrapper in-place
- [ ] Add DecryptionStubEntryV2 with DECRYPTED_FLAG and access_count fields
- [ ] Implement stringAccessThunk(): lazy decrypt via VM_NATIVE_CALL with VirtualProtect
- [ ] Modify x86_lifter.h: emit lazy-access thunk at LEA/MOV string references
- [ ] Add --string-lazy-decrypt CLI flag and config
- [ ] Add DecryptionStubEntryV3 with backup_offset for original ciphertext
- [ ] Implement stringReleaseThunk(): decrement refcount, restore ciphertext at zero
- [ ] Emit release thunks at VM_RET for functions with string references
- [ ] Embed ciphertext backup blob in .pecker section
- [ ] Write nested table encryption roundtrip tests
- [ ] Write lazy decrypt single/multiple/idempotent tests
- [ ] Write re-encrypt + re-decrypt cycle tests

