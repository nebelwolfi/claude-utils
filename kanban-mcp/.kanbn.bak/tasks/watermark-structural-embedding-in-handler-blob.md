---
created: 2026-02-26T20:23:02.610Z
updated: 2026-03-02T12:45:50.620Z
started: 2026-02-27T20:19:12.700Z
completed: 2026-03-01T04:24:34.580Z
---

# Watermark: structural embedding in handler blob

Encode additional watermark bits into: (1) specific bits of the opcode permutation mapping, (2) handler order within the blob (specific permutation encodes bits), (3) inter-handler padding sizes (LSB of each padding = 1 bit). These channels are orthogonal to bytecode-level embedding.

## Relations

- [requires watermark-payload-encoding-and-ecc](watermark-payload-encoding-and-ecc.md)
