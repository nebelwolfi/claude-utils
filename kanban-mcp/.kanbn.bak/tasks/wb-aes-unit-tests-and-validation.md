---
created: 2026-02-26T20:21:31.823Z
updated: 2026-03-02T11:20:54.672Z
started: 2026-02-27T20:08:08.819Z
completed: 2026-02-28T06:36:06.127Z
---

# WB-AES: unit tests and validation

tests/wb_aes_tests.cpp. NIST AES-128 test vectors for WB single-block. Serialization round-trip. WB-CTR decrypt of standard-AES-CTR-encrypted data (multiple sizes). External encodings produce different tables but correct decryption. Pipeline: encrypt with WB, execute fib. Backward compat: XOR-rotate and AES-CTR unchanged.

## Relations

- [requires wb-aes-cli-flags-and-encryption-mode-extension](wb-aes-cli-flags-and-encryption-mode-extension.md)
