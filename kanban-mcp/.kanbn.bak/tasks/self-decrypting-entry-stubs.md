---
created: 2026-03-07T01:41:36.424Z
updated: 2026-03-07T08:10:31.759Z
started: 2026-03-07T08:03:24.609Z
completed: 2026-03-07T08:10:31.759Z
---

# Self-Decrypting Entry Stubs

Encrypt the entry stub body after the plaintext prolog. A small plaintext decryptor header decrypts the body in-place before executing, then re-encrypts before returning. Prevents static disassembly of entry stubs.

**Layout:**
```
PLAINTEXT: [prolog: pushes + mov r10/r11 + stack probe]              ~48 bytes
PLAINTEXT: [decrypt_header: XOR-decrypt body in-place, fall through] ~30-45 bytes
ENCRYPTED→DECRYPTED: [body: zero-init ... call interp ... extract RAX] ~80-120 bytes
PLAINTEXT: [re-encrypt: XOR-encrypt body in-place]                   ~20-30 bytes
PLAINTEXT: [epilogue: ADD RSP + POPs + RET]                          ~18 bytes
```

**Encryption**: Per-byte XOR with rolling key derived from 4-byte per-stub constant: `key_byte(i, K) = ROL8(K[i%4], i%8) ^ (i & 0xFF)`. Symmetric (same op encrypts and decrypts).

**Thread safety**: Atomic u32 refcount sentinel (LOCK INC on entry, LOCK DEC on exit). First entrant decrypts, last leaver re-encrypts. Sentinel allocated in section data adjacent to stub.

**Metamorphic decryptor**: Decrypt/re-encrypt headers vary per-seed: register selection (ECX/EDX/R8D for counter, RSI/RDI/R9 for pointer), key loading method (MOV/LEA/XOR-split), loop direction (up/down), shift variant (ROL/ROR). ~48 unique header templates before junk.

**.pdata**: Unaffected - prolog_size recorded before decrypt header. Decrypt header is post-prolog plaintext code.

**Section**: .pecker needs IMAGE_SCN_MEM_WRITE (already set when encryption active). Encryption applied AFTER all fixup patching.

**Inlined stubs**: ✅ Skip self-decryption for inlined stubs (in .text) - NOPs decrypt header + re-encrypt trailer, clears metadata, skips sentinel reservation. Done in subtask 17.

**Key files**: entry_stub.h (core), cmd_protect.h (section builder + encryption application), config.h/args.h (flags)

## Completed subtasks

- Subtask 12: Reserve 4-byte sentinel per stub in section layout
- Subtask 13: Derive per-stub 4-byte encryption key
- Subtask 14: Apply body encryption after all fixup patching
- Subtask 15: Sentinel fixup patching verification tests
- Subtask 16: IMAGE_SCN_MEM_WRITE when self_decrypt enabled
- Subtask 17: Skip self-decryption for inlined stubs (.text section)

## Sub-tasks

- [x] Subtask 18: E2E integration tests - protect-and-run golden rule with self_decrypt_stubs=true
