---
created: 2026-02-26T20:23:01.089Z
updated: 2026-03-02T12:17:17.809Z
started: 2026-02-27T20:19:08.655Z
completed: 2026-03-01T04:11:19.561Z
---

# Watermark: bytecode-level embedding pass

WatermarkPass extends ObfuscationPass. Scans for carrier instructions (ADD/SUB/MOV_RR/MOV_RI zero/XOR). For each carrier, selects variant A or B based on next watermark bit. Requires >= 112 carriers; if insufficient, falls back to junk insertion to create more. Pipeline: after all other passes, before encryption.

## Relations

- [requires watermark-payload-encoding-and-ecc](watermark-payload-encoding-and-ecc.md)
