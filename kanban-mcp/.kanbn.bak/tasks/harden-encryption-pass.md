---
created: 2026-03-04T14:01:18.558Z
updated: 2026-03-04T14:01:18.558Z
priority: high
tags:
  - hardening
  - encryption
  - existing-pass
---

# Harden EncryptionPass

## Overview
Harden the existing EncryptionPass with four improvements: stronger ciphers, per-function nonces, CSPRNG key derivation, and authenticated encryption.

## Improvement 1: Replace XorRotate with ChaCha20
- Implement freestanding ChaCha20 in new `include/PEcker/obfuscation/chacha20.h` (quarter-round, CTR mode, ~35 lines)
- Must be PIC-compatible (`#ifdef FLAT_VM_FREESTANDING`)
- Expand `EncryptionKey` from 32 to 48 bytes (key[32] + nonce[12] + pad[4])
- Add `EncryptionMode::ChaCha20` (value=3) to the enum
- Update all 3 flat VM preambles (switch/computed-goto/threaded) with ChaCha20 decrypt path
- **FlatVmContext impact**: `encryption_key` grows 32→48 bytes, shifting ALL downstream field offsets by +16

## Improvement 2: Per-Function Nonce Derivation
- Mix function RVA into nonce: `per_func_nonce = SHA256(master_nonce || LE32(rva))[0..nonce_len]`
- Add `uint32_t func_rva` field to FlatVmContext (after `encryption_mode`)
- Entry stub writes func_rva; PIC interpreter derives per-func nonce before decrypting
- Needs freestanding SHA-256 derivation in PIC blob (extract from shared lib's inline functions)
- Blast radius of key recovery limited to single function

## Improvement 3: CSPRNG + HKDF Key Derivation
- New file `include/PEcker/obfuscation/hkdf.h`: HMAC-SHA256, HKDF-Extract, HKDF-Expand
- `generateKeyCsprng()`: 16 bytes from `std::random_device`, HKDF to derive key+nonce
- Build-time only (no PIC/context changes)
- `--global-seed` uses legacy deterministic path; no seed uses CSPRNG
- Eliminates the 2^64 brute-forceable keyspace

## Improvement 4: AES-GCM Authentication Tags
- Add `EncryptionMode::AesGcm` (value=4)
- Per-function 16-byte authentication tag; AAD = function RVA (prevents block-swap)
- Add `uint8_t auth_tag[16]` to FlatVmContext
- Port AES-GCM (encrypt_state, crypt_gcm, calc_gcm_tag, gf128_mul) to freestanding PIC code
- Tag verification before decryption; on failure `FLAT_VM_STATUS_AUTH_FAILED`
- Section layout: 16-byte tag after each function's bytecode

## Combined FlatVmContext Impact
- `encryption_key`: 32→48 bytes (+16)
- New `func_rva`: +4 bytes
- New `auth_tag[16]`: +16 bytes
- Total: +36 bytes. All downstream offsets shift. CTX_SIZEOF ~12892.
- Must update entry_stub.h, chained_handlers.h ctx:: namespace, rebuild all 3 PIC blobs

## Key Files
- `include/PEcker/obfuscation/encryption.h` - core encryption logic
- `include/PEcker/vm/vm_engine_flat.h` - FlatVmContext + all 3 decrypt preambles
- `include/PEcker/stub/entry_stub.h` - CTX offset constants + key copy logic
- `include/PEcker/commands/cmd_protect.h` - section layout + pipeline
- `include/PEcker/cli/args.h` - new --encrypt-algo values

## Implementation Order
1. CSPRNG+HKDF (build-time only, simplest)
2. ChaCha20 (FlatVmContext layout change + PIC blob)
3. Per-function nonce (adds func_rva + SHA-256 derivation)
4. AES-GCM auth tags (most complex, freestanding GCM in PIC blob)

## Sub-tasks
- [ ] Create `include/PEcker/obfuscation/chacha20.h` with freestanding ChaCha20 (quarter-round + CTR mode), PIC-compatible
- [ ] Expand EncryptionKey struct from 32 to 48 bytes (key[32]+nonce[12]+pad[4])
- [ ] Add EncryptionMode::ChaCha20 (value=3) and wire into encryption.h cryptBytecode()
- [ ] Add flat_chacha20_crypt() to vm_engine_flat.h and update all 3 decrypt preambles
- [ ] Update all FlatVmContext field offsets in entry_stub.h (+16 shift from key expansion)
- [ ] Update chained_handlers.h ctx:: namespace offsets
- [ ] Create `include/PEcker/obfuscation/hkdf.h` with HMAC-SHA256 + HKDF-Extract + HKDF-Expand
- [ ] Add generateKeyCsprng() using std::random_device + HKDF; keep generateKeyLegacy() for --global-seed
- [ ] Add derivePerFuncNonce() in encryption.h: SHA256(master_nonce || LE32(rva))
- [ ] Add uint32_t func_rva to FlatVmContext; entry stub writes it; interpreter derives per-func nonce
- [ ] Add freestanding SHA-256 nonce derivation to PIC blob
- [ ] Add EncryptionMode::AesGcm (value=4) with per-function 16-byte auth tags
- [ ] Port AES-GCM (encrypt_state, crypt_gcm, calc_gcm_tag, gf128_mul) to freestanding PIC code
- [ ] Add uint8_t auth_tag[16] to FlatVmContext; entry stub copies from section data
- [ ] Add FLAT_VM_STATUS_AUTH_FAILED status code; tag verification before decryption
- [ ] Update section layout in cmd_protect.h: 48-byte key region, per-function tags
- [ ] Add --encrypt-algo chacha20|aes-gcm CLI flags to args.h
- [ ] Rebuild all 3 PIC blobs (switch/computed-goto/threaded)
- [ ] Write ChaCha20 test vectors (RFC 8439) + roundtrip tests
- [ ] Write HMAC-SHA256/HKDF test vectors (RFC 4231/5869)
- [ ] Write per-function nonce derivation tests (deterministic, different RVAs differ)
- [ ] Write AES-GCM auth tag tests (roundtrip, tamper detection, wrong AAD rejection)
- [ ] Write flat VM integration tests for each new encryption mode

