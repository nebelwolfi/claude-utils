---
created: 2026-02-26T20:21:17.247Z
updated: 2026-03-02T02:05:58.509Z
started: 2026-02-27T20:07:50.932Z
completed: 2026-02-28T01:33:56.306Z
---

# WB-AES: core table generator

Create include/PEcker/obfuscation/wb_aes.h. WhiteBoxAesContext struct with type2_tables[10][16][256], tyi_tables[4][256], input/output/inv encodings. generateWhiteBoxTables(key, seed): key expansion via shared AES, fold round keys into T-boxes, generate external encodings via Fisher-Yates. serializeTables()/deserializeTables() for section embedding. ~280KB total.
