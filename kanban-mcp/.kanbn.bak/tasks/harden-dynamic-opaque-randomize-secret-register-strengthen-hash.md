---
created: 2026-03-03T20:19:40.040Z
updated: 2026-03-03T20:19:40.040Z
tags:
  - hardening
  - dynamic-opaque
  - crypto
---

# Harden: DynamicOpaque - randomize secret register + strengthen hash

R13 is hardcoded for secret storage across ALL correlated predicates. FNV hash constants are well-known. Scratch registers R14/R15 are always the same.

## Changes

**1. Randomize secret register:**
Current: R13 always holds the secret. Make it configurable per-build - randomly select from R8-R13 (registers less commonly used in user code). Update prologue/epilogue to save/restore the chosen register.

**2. Randomize scratch registers:**
Current: R14 for computation, R15 for temporaries. Pick random scratch registers from the pool (excluding secret register and special registers).

**3. Strengthen correlated hash:**
Current: `h = (secret ^ index) * 0x517CC1B727220A95; h >>= 13; bit = h & 1`
This is a simple multiply-shift hash vulnerable to algebraic solving.

Strengthen with double-round mixing:
```cpp
h = secret ^ index;
h *= K1;
h ^= (h >> 17);
h *= K2;
h ^= (h >> 13);
bit = h & 1;
```
Where K1, K2 are different per-build random constants (not the fixed golden-ratio constant).

**4. Variable predicate structure:**
Current: all correlated predicates are exactly 82 bytes with identical instruction sequence. Add NOP padding and instruction reordering variants to vary the structure.

**5. Vary branch skip offset:**
Current: always `JZ/JNZ +6; NOP`. Instead of NOP, insert variable-length dead code (1-4 instructions), making the skip offset unpredictable.

**Files:** `include/PEcker/obfuscation/dynamic_opaque.h`

## Sub-tasks
- [x] Make secret register configurable (random from R8-R13 per build)
- [x] Randomize scratch registers in all predicate types
- [x] Strengthen correlated hash (double-round mixing with per-build constants)
- [x] Add variable NOP padding to vary predicate size
- [x] Vary branch skip offset with variable-length dead code

