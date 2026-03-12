---
created: 2026-02-26T20:22:02.547Z
updated: 2026-03-02T17:32:56.191Z
started: 2026-02-27T20:09:05.843Z
completed: 2026-02-28T01:16:33.182Z
---

# Anti-decompile: chained handler gadget injection

Handler wrapping in generateChainedHandlerSet(): wrapHandlerCode() prepends/appends gadgets, adjusts all fixup offsets. Post-dispatch JMP replaced with opaque indirect variant. Density-gated via AntiDecompileConfig.

## Relations

- [requires anti-decompile-gadget-code-generation-library](anti-decompile-gadget-code-generation-library.md)
