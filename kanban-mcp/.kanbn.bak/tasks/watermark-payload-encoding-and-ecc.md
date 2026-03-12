---
created: 2026-02-26T20:22:56.361Z
updated: 2026-03-02T12:43:21.886Z
started: 2026-02-27T20:19:07.137Z
completed: 2026-03-01T04:12:38.207Z
---

# Watermark: payload encoding and ECC

Create include/PEcker/obfuscation/watermark.h. WatermarkPayload: customer_id (u32), timestamp (u32), build_number (u16) = 80 bits + 32 bits Reed-Solomon ECC = 112 bits. encodePayload()/decodePayload() with bit-level access. RS(7,5) over GF(2^16) for 2-symbol error correction.
