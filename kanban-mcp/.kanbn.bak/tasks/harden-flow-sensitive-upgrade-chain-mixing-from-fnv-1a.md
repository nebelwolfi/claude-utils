---
created: 2026-03-03T20:19:04.295Z
updated: 2026-03-03T20:19:04.295Z
started: 2026-03-12T09:06:04.336Z
tags:
  - hardening
  - flow-sensitive
  - crypto
---

# Harden: FlowSensitive - upgrade chain mixing from FNV-1a

Flow-sensitive encryption uses FNV-1a for chain-state mixing. FNV-1a is not cryptographically secure - an attacker with known-plaintext can solve the chain backward in linear time.

## Changes

**1. Stronger mixing function:**
Replace `mixChainState` (currently `state ^= byte; state *= FNV_PRIME`) with a more cryptographically resistant mixing:
- Option A: Use SipHash-2-4 (fast, better avalanche than FNV)
- Option B: Use AES single-round mixing (if AES primitives available from shared lib)
- Option C: Double-mix: apply FNV twice with different primes, then fold

**2. Encrypt opcode bytes:**
Currently the opcode byte (first byte of each instruction) is NOT encrypted. This allows instruction boundary identification without decryption. Consider encrypting the opcode too and storing instruction lengths in a side table or deriving them from the decrypted opcode.

**3. Add HMAC per-instruction:**
After encryption, compute a short MAC (e.g., truncated hash) over each encrypted instruction. Store in a verification table. At runtime, verify before executing - detects tampering earlier than cascading corruption.

**Files:** `include/PEcker/obfuscation/flow_sensitive.h`

## Sub-tasks
- [x] Research available crypto primitives in shared library (SipHash, AES single-round)
- [x] Replace FNV-1a mixing with stronger hash
- [ ] Consider encrypting opcode bytes (with side-table for instruction lengths)
- [ ] Optional: add per-instruction HMAC verification

