---
created: 2026-02-26T20:58:28.178Z
updated: 2026-03-03T17:05:08.785Z
started: 2026-02-27T20:19:18.650Z
completed: 2026-03-03T13:08:53.903Z
---

# Chained harden: polymorphic dispatch epilogue

Replace the single emitDispatchNext() (line 339 of chained_handlers.h) with emitDispatchNextPoly(c, rng) that randomly selects from 5+ semantically equivalent x86-64 instruction sequences per handler. Currently every non-terminal handler ends with the identical 17-byte pattern 48 8B 83 90000000 4C 01 E8 0F B6 08 41 FF 24 CC - trivially signature-scannable. Add dispatch_epilogue_offset field to ChainedHandler struct to mark where the epilogue starts, then post-process in generateChainedHandlerSet() replacing the trailing bytes with a random variant. Variant forms use different register choices (RCX/RDX vs RAX), addressing modes (LEA vs ADD), bytecode ptr source (R13 vs ctx field), and final JMP encoding (direct vs LEA+indirect). ~200 lines in chained_handlers.h. Gated by --poly-dispatch flag (default true).

## Sub-tasks

- [x] Add dispatch_epilogue_offset field to ChainedHandler struct
- [x] Implement 5-6 variant emitter functions (emitDispatchNextFormA through F)
- [x] Implement emitDispatchNextPoly(c, rng) random selector
- [x] Thread RNG into generateChainedHandlerSet() post-processing pass
- [x] Add poly_dispatch field to PeckerConfig and --poly-dispatch to args parser
- [x] Add tests: verify different seeds produce different epilogue bytes, no two handlers in same set share identical epilogue
