---
created: 2026-03-04T18:14:34.404Z
updated: 2026-03-10T15:43:10.702Z
started: 2026-03-09T11:17:25.654Z
completed: 2026-03-10T15:36:27.676Z
priority: high
tags:
  - entry-stub
  - VM-core
  - anti-pattern-matching
  - context-layout
---

# FlatVmContext Field Randomization

Per-build randomization of FlatVmContext field offsets. Currently all fields at fixed offsets (registers@0, bytecode@192, stack@520). Randomize layout so each build has unique context structure.

**ContextLayout struct** (new file context_layout.h): Stores per-field offsets. `generate(seed)` produces randomized layout, `defaultLayout()` returns current fixed layout for backward compat.

**Two-level randomization**:
1. **Slot permutation**: 6 contiguous blocks (registers[24], stack[1024], decrypted_buf[4096], exception_frames[16], encryption_key[32], scalars) shuffled. 720 permutations.
2. **Scalar field shuffle**: 14 individual scalar fields (bytecode, bytecodeSize, inverse_map, encryption_mode, etc.) shuffled within their slot. 14! ≈ 87 billion permutations.
3. **Dead padding**: Random 0-64 bytes between slots. Variable total context size.

**Scope**: Chained dispatch mode only (primary target). PIC blob modes (switch/computed-goto/threaded) use fixed C struct layout at compile time - would require per-build blob recompilation (deferred).

**Cascading changes**: ~150 offset references in chained_handlers.h (ctx:: namespace → layout.field()), all 3 stub generators in entry_stub.h (CTX_* constants → layout.*), loader_stub.h (fix stale FLAT_VM_CTX_SIZE=12824 bug), cmd_protect.h (pipeline integration).

**Constraints**: registers[24] must stay contiguous (indexed by reg#). stack[1024] and decrypted_buf[4096] contiguous. 8-byte alignment for pointers. No runtime overhead - all offsets baked into generated machine code at protect time.

**Key files**: new context_layout.h, chained_handlers.h (~150 substitutions), entry_stub.h, cmd_protect.h, diversity.h

## Sub-tasks

- [x] Create context_layout.h with ContextLayout struct and all field offset members
- [x] Implement ContextLayout::defaultLayout() matching current fixed offsets
- [x] Implement ContextLayout::generate(seed) with slot permutation + scalar shuffle + dead padding
- [x] Add validate() method checking alignment and no-overlap invariants
- [x] Add context_layout dimension to DiversityConfig and DiversitySeedDeriver
- [x] Refactor chained_handlers.h: replace ctx:: namespace constants with layout-derived values (~150 substitutions)
- [x] Refactor generateEntryStub(): replace CTX_* constants with layout.* values
- [x] Refactor generateChainedEntryStub(): replace CTX_* constants
- [x] Refactor generateNestingStub(): replace CTX_* constants
- [x] Fix loader_stub.h stale FLAT_VM_CTX_SIZE=12824 → use layout.total_size
- [x] Make STACK_ALLOC runtime-computed from layout.aligned_size (no longer constexpr)
- [x] Wire ContextLayout through buildPeckerSectionV2() and cmd_protect.h pipeline
- [x] Add runtime assertion: if dispatch_mode != Chained && layout != defaultLayout, error out
- [x] Add randomize_context flag to PeckerConfig + CLI parsing
- [x] Write test: defaultLayout matches sizeof(FlatVmContext) and offsetof for all fields
- [x] Write test: generate() deterministic for same seed
- [x] Write test: different seeds produce different layouts
- [x] Write test: validate() passes for all generated layouts
- [x] Write test: no field regions overlap
- [x] Write test: end-to-end chained mode execution with randomized layout
