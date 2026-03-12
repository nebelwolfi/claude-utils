---
created: 2026-02-26T20:21:25.129Z
updated: 2026-03-02T17:08:05.848Z
started: 2026-02-27T20:08:04.752Z
completed: 2026-03-01T04:27:55.095Z
---

# WB-AES: section layout and entry stub integration

Replace 32-byte encryption_key region with ~280KB WB table blob in .pecker section. Add wb_tables pointer to FlatVmContext, update CTX_SIZEOF/offsets in entry_stub.h. Entry stub LEAs table base. Add encryption_mode=2 (WB_AES_CTR) branch to flat VM decryption preamble. Section header flags bit 9 (0x200) signals WB mode.

## Relations

- [requires wb-aes-runtime-table-lookup-decryptor](wb-aes-runtime-table-lookup-decryptor.md)
