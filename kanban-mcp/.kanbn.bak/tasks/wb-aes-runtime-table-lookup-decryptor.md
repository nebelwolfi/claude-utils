---
created: 2026-02-26T20:21:21.037Z
updated: 2026-03-02T11:39:09.001Z
started: 2026-02-27T20:07:52.545Z
completed: 2026-02-28T06:46:20.612Z
---

# WB-AES: runtime table-lookup decryptor

Create include/PEcker/obfuscation/wb_aes_runtime.h. wbAesEncryptBlock(tables, in, out): 10-round table-lookup AES using ShiftRows permutation + T-box + Tyi XOR. wbAesCtrDecrypt(tables, data, size, nonce): CTR-mode wrapper. Freestanding: no CRT, no allocations, PIC-compatible.

## Relations

- [requires wb-aes-core-table-generator](wb-aes-core-table-generator.md)
