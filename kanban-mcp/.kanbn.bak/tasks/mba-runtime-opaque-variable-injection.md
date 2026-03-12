---
created: 2026-03-11T15:14:09.198Z
updated: 2026-03-11T15:14:40.159Z
tags:
  - mba
  - griffin-style
  - hardening
  - anti-static-analysis
---

# MBA: Runtime Opaque Variable Injection

Inject runtime-varying values as the 3rd variable in 3-variable MBA expansions, matching Griffin's use of `&retaddr` (stack return address) to defeat static simplification tools.

**Depends on**: MBA: 3-Variable Expansion Functions

**Background**: Griffin mixes `(unsigned __int64)&retaddr` into MBA expressions. Since the return address changes per call site, static tools (SSPAM, MBA-Blast, SiMBA) cannot evaluate the expression without runtime context. The key insight is that since `x OP y` doesn't depend on z, the truth-table coefficients repeat in pairs - the result is correct regardless of z's value. But a static analyzer must *prove* z is irrelevant, which requires solving the full 8-term system.

**Opaque sources** (enum `OpaqueSource`):
1. `RandomConstant` - `MOV_RI z, rng()` - always safe, default for tests
2. `StackPointer` - `MOV_RR z, RSP` then `XOR z, random_mask` - varies per call depth
3. `ReturnAddress` - `MOV_RM z, [RSP + frame_offset]` - varies per call site (requires VM memory read opcode)

**Safety**: All sources produce correct results because z is algebraically irrelevant. `RandomConstant` is the fallback for unit tests and when `runtime_opaque` is disabled.

**Gated by**: `config.runtime_opaque` flag (default false). When false, z is loaded with a random constant.

**File**: `include/PEcker/obfuscation/mba.h` - update `emitLoadZ()` to support opaque sources.

## Sub-tasks
- [ ] Add `OpaqueSource` enum: RandomConstant, StackPointer, ReturnAddress
- [ ] Implement `emitLoadOpaqueZ()` for each source (RandomConstant: MOV_RI; StackPointer: MOV_RR RSP + XOR mask; ReturnAddress: MOV_RM [RSP+offset])
- [ ] Wire into `expandLinear3Var*` functions: call `emitLoadOpaqueZ()` to populate z register before expansion
- [ ] Add `runtime_opaque` to MbaConfig, PeckerConfig, args.h, pipeline.h, cmd_protect.h, project_file.h
- [ ] Ensure RandomConstant fallback when runtime_opaque is disabled


## Relations
- [blocked by mba-3-variable-expansion-functions](mba-3-variable-expansion-functions.md)

