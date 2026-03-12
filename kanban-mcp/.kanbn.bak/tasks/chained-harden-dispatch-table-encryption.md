---
created: 2026-02-26T20:58:46.424Z
updated: 2026-03-03T00:24:06.206Z
completed: 2026-02-27T23:25:22.923Z
started: 2026-03-01T23:50:21.319Z
---

# Chained harden: dispatch table encryption

XOR-encrypt the dispatch_offsets[256] array in the .pecker section with a per-build rolling key. Entry stub decrypts during table build. Currently the dispatch_offsets are stored as plaintext u32s - an analyst reading the section data gets a complete opcode-to-handler mapping instantly. Encryption: dispatch_offsets[i] ^= (base_key ^ (i * 0x01010101)). Decryption adds 3 instructions to the build loop body (XOR + IMUL + XOR). Partially unroll the build loop by 4 with varied junk between iterations to obscure the loop pattern. Add dispatch_xor_key field to ChainedHandlerSet. Entry stub grows ~80-120B per function. ~150 lines across chained_handlers.h and entry_stub.h. Gated by --encrypt-dispatch-table (default true).

## Sub-tasks

- [x] Add dispatch_xor_key field to ChainedHandlerSet
- [x] Encrypt dispatch_offsets[] in generateChainedHandlerSet() after computing them
- [x] Modify entry stub dispatch table build loop to decrypt (XOR + IMUL + XOR)
- [x] Partially unroll build loop by 4 with junk operations between iterations
- [x] Pass encryption key through section builder (cmd_protect.h)
- [x] Add encrypt_dispatch_table field to PeckerConfig and --encrypt-dispatch-table to args parser
- [x] Add tests: verify encrypted offsets differ from plaintext, verify runtime decryption produces correct table
