---
created: 2026-03-04T13:29:53.710Z
updated: 2026-03-04T13:29:53.710Z
tags:
  - obfuscation
  - anti-signature
  - entry-stub
  - polymorphic
---

# Polymorphic Decryption Stub

## Overview
Generate unique per-build decryption stubs using equivalent instruction substitutions, making every protected binary's decryption routine structurally distinct. This defeats signature-based detection and static pattern matching on the bytecode decryption preamble.

## Approach: Entry-Stub-Resident Polymorphic Engine
The polymorphic engine generates x86-64 machine code **inline in each entry stub** (not in the PIC interpreter blob). Each function's entry stub gets a unique decryption routine that is semantically equivalent but syntactically different.

## Instruction Substitution Techniques
1. **XOR → DeMorgan**: `A ^ B` becomes `(A & ~B) | (~A & B)` using AND/NOT/OR sequences
2. **ROL → SHL+SHR+OR**: `ROL x, n` becomes `(x << n) | (x >> (bits-n))`
3. **SUB → ADD+NEG**: `SUB A, B` becomes `NEG B; ADD A, B` or `ADD A, -B`
4. **MOV → PUSH+POP**: `MOV reg1, reg2` becomes `PUSH reg2; POP reg1`
5. **Register permutation**: Swap which scratch registers are used (R10↔R11, RAX↔RCX for non-ABI-critical sections)
6. **Junk insertion**: NOP slides, dead MOVs, redundant CMP+Jcc pairs between real instructions
7. **Constant splitting**: `MOV RAX, 0xDEAD` becomes `MOV RAX, 0xDE00; OR RAX, 0xAD`
8. **Equivalent branch forms**: `JZ` ↔ `JE`, `TEST+JZ` ↔ `CMP 0+JE`, `DEC+JNZ` ↔ `SUB 1+JNZ`

## Architecture

### New File: `include/PEcker/obfuscation/poly_decrypt.h`
```
PolyDecryptConfig {
    bool enable_demorgan;        // XOR→DeMorgan substitution
    bool enable_rol_expand;      // ROL→SHL+SHR+OR
    bool enable_reg_permute;     // scratch register shuffling
    bool enable_junk;            // dead code insertion
    uint8_t junk_density;        // 0-5 junk insns per real insn
    uint32_t seed;               // per-build RNG seed
}

PolyDecryptStub {
    std::vector<uint8_t> code;   // generated x86-64 bytes
    size_t decrypt_offset;       // offset to patch encrypted data ptr
    size_t key_offset;           // offset to patch decryption key
    size_t size_offset;          // offset to patch data size
}
```

### Core Generator: `generatePolyDecryptStub(config, rng) → PolyDecryptStub`
1. Build IR-like sequence of "meta-instructions" (LOAD_PTR, XOR_DECRYPT, ADVANCE, LOOP)
2. For each meta-instruction, randomly select from equivalent x86-64 expansions
3. Randomly assign scratch registers from pool (avoiding RSP, RBP, context registers)
4. Insert junk instructions between real ones based on density setting
5. Assemble final byte sequence with relocation slots for ptr/key/size patching

### Integration Points
- **`entry_stub.h`**: `generateEntryStub()` calls `generatePolyDecryptStub()` instead of emitting fixed XOR loop. Patches relocation slots with actual bytecode address, key, and size.
- **`diversity.h`**: Add `PolyDecryptConfig` to `DiversityProfile`. Each build gets different substitution choices.
- **`config.h`**: Add `PECKER_ENABLE_POLY_DECRYPT` toggle (default: 1).
- **`cmd_protect.h`**: Pass poly config through pipeline; each function's entry stub gets independently randomized stub.
- **`args.h`**: Add `--poly-decrypt` / `--no-poly-decrypt` flags. `--shizo` enables with max junk density.

## Testing (~20 test cases)
- Each substitution technique individually (DeMorgan, ROL expand, reg permute, etc.)
- Combined substitutions with various RNG seeds produce different byte sequences
- Generated stubs correctly decrypt known ciphertext
- Stub size stays within reasonable bounds (< 4KB per function)
- Register permutation doesn't clobber ABI-required registers
- Two stubs with different seeds are byte-different but semantically equivalent
- Integration: protected binary with poly decrypt runs correctly
- Edge cases: zero-length data, single-byte data, maximum junk density

## Sub-tasks
- [ ] Create `include/PEcker/obfuscation/poly_decrypt.h` with PolyDecryptConfig and PolyDecryptStub structs
- [ ] Implement meta-instruction IR: LOAD_PTR, XOR_DECRYPT, ADVANCE_PTR, DEC_COUNTER, LOOP_BACK
- [ ] Implement DeMorgan XOR substitution: A^B → (A&~B)|(~A&B) with proper x86-64 encoding
- [ ] Implement ROL expansion: ROL x,n → (SHL x,n)|(SHR x,64-n) with proper encoding
- [ ] Implement SUB→ADD+NEG and MOV→PUSH+POP substitutions
- [ ] Implement register permutation: pool of scratch registers, random assignment per stub
- [ ] Implement junk instruction insertion: NOP variants, dead MOV, redundant CMP+Jcc
- [ ] Implement constant splitting: split immediates into ADD/OR/XOR of partial values
- [ ] Implement equivalent branch form substitution (JZ↔JE, TEST+JZ↔CMP+JE, etc.)
- [ ] Build `generatePolyDecryptStub(config, rng)` assembler: meta-IR → substitution selection → register assignment → junk insertion → byte emission
- [ ] Add relocation slot tracking (decrypt_offset, key_offset, size_offset) for post-generation patching
- [ ] Add `PECKER_ENABLE_POLY_DECRYPT` to `config.h` with default=1 and stub fallback
- [ ] Integrate into `entry_stub.h`: replace fixed XOR loop with call to generatePolyDecryptStub()
- [ ] Add PolyDecryptConfig to DiversityProfile in `diversity.h`
- [ ] Add `--poly-decrypt` / `--no-poly-decrypt` CLI flags to `args.h`, wire into --shizo/--weak presets
- [ ] Wire through `cmd_protect.h` pipeline: per-function independent RNG seed for each stub
- [ ] Write unit tests: individual substitution correctness (DeMorgan, ROL, reg permute)
- [ ] Write unit tests: combined substitutions produce different bytes with different seeds
- [ ] Write unit tests: generated stub correctly decrypts known ciphertext
- [ ] Write integration test: full protect pipeline with poly decrypt enabled produces working binary

