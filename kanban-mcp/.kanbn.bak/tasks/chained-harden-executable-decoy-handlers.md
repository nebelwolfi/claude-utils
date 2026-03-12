---
created: 2026-02-26T20:58:41.891Z
updated: 2026-03-03T01:28:31.373Z
started: 2026-02-27T20:19:20.778Z
completed: 2026-03-03T01:28:31.373Z
---

# Chained harden: executable decoy handlers

Replace non-functional random padding between handlers (line 2941-2946 of chained_handlers.h) with plausible x86-64 code fragments that mimic real handler patterns. New generateDecoyHandler(rng) emits 3-10 random operations using existing emit helpers: loads/stores from [rbx+disp], arithmetic, movzx operand decodes, same register convention (RBX, R12, R13). Ends with a polymorphic dispatch epilogue (requires poly-dispatch task). Insert 1-3 decoys between each pair of real handlers. Total blob increase ~4KB. Analyst cannot distinguish real from decoy without tracing execution. Gated by --decoy-handlers (default true) and --decoy-density=N (1-5, default 2).

## Sub-tasks

- [x] Implement generateDecoyHandler(rng) with 6+ operation types
- [x] Integrate into generateChainedHandlerSet() blob assembly loop
- [x] Add decoy_handlers and decoy_density fields to PeckerConfig
- [x] Add --decoy-handlers and --decoy-density to args parser
- [x] Add tests: verify decoy count matches config, decoys contain valid x86 instructions

## Relations

- [requires chained-harden-polymorphic-dispatch-epilogue](chained-harden-polymorphic-dispatch-epilogue.md)
