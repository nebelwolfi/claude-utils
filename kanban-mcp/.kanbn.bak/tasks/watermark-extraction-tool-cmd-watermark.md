---
created: 2026-02-26T20:23:05.706Z
updated: 2026-03-02T17:09:50.159Z
started: 2026-02-27T20:19:15.784Z
completed: 2026-03-01T04:32:58.131Z
---

# Watermark: extraction tool (cmd_watermark)

New CLI subcommand: pecker watermark --extract binary. Reads .pecker section, identifies carrier instructions, extracts bit sequence, applies RS ECC decoding, outputs WatermarkPayload. Also extracts structural watermark from handler permutation and padding. Requires knowledge of the embedding scheme (secret per-author key derived from --watermark-key).

## Relations

- [requires watermark-bytecode-level-embedding-pass](watermark-bytecode-level-embedding-pass.md)
- [requires watermark-structural-embedding-in-handler-blob](watermark-structural-embedding-in-handler-blob.md)
