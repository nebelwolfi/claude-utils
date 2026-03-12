---
created: 2026-03-03T20:18:54.344Z
updated: 2026-03-03T20:18:54.344Z
tags:
  - hardening
  - encryption
  - kdf
---

# Harden: Encryption - proper KDF instead of raw MT19937

`generateKey()` in `encryption.h` uses Mersenne Twister seeded with a `u64` cast to `unsigned int` (32-bit truncation!). MT19937 is not cryptographically secure and has known state-recovery attacks.

## Changes

**1. Fix seed truncation:**
Current line 97: `std::mt19937 rng(static_cast<unsigned int>(seed))` - discards upper 32 bits. Use `std::mt19937_64` or better yet, don't use MT at all.

**2. Replace with proper KDF:**
Use the shared library's SHA-256 (`shared/__crypt/sha.h`) to derive key material:
```cpp
inline EncryptionKey generateKey(u64 seed) {
    EncryptionKey ek;
    u8 seed_bytes[8];
    std::memcpy(seed_bytes, &seed, 8);
    // HKDF-like: SHA256(seed || "pecker_key") for key, SHA256(seed || "pecker_nonce") for nonce
    auto key_hash = sha256(seed_bytes, 8, "pecker_key", 10);
    auto nonce_hash = sha256(seed_bytes, 8, "pecker_nonce", 12);
    std::memcpy(ek.key, key_hash.data(), 16);
    std::memcpy(ek.nonce, nonce_hash.data(), 16);
    return ek;
}
```
Check what SHA/hash primitives are available in `shared/__crypt/sha.h` and `shared/__crypt/hash.h`.

**Files:** `include/PEcker/obfuscation/encryption.h`, check `shared/__crypt/sha.h`

## Sub-tasks
- [x] Audit shared library for available hash primitives (SHA-256, HKDF)
- [x] Replace MT19937 with SHA-based key derivation
- [x] Fix u64-to-u32 seed truncation
- [x] Verify existing encryption tests still pass

