---
created: 2026-03-11T15:13:40.711Z
updated: 2026-03-11T15:14:38.819Z
priority: high
tags:
  - mba
  - griffin-style
  - config
  - cli
---

# MBA: 3-Variable Variant Dispatch + Config Plumbing

Wire the new 3-variable MBA expansions into the variant dispatch system and add config/CLI flags to control them.

**Depends on**: MBA: 3-Variable Expansion Functions

**New variants**: V6 (3-var linear) and V7 (chained 3-var, see separate task) for ADD/SUB/XOR/AND. V5/V6 for OR.

**Config changes** - add to `MbaConfig`:
```cpp
u32 basis_vars = 2;         // 2 = 4-term, 3 = 8-term Griffin-style
bool nested_basis = false;  // De Morgan nesting of basis sub-expressions
bool chain_mba = false;     // expression chaining (2-stage dependent MBA)
```

**Variant gating**: When `basis_vars == 2`, V6/V7 are excluded from random selection (backwards compatible). When `basis_vars >= 3`, V6/V7 are included in the pool on pass 0.

**Files to update**:
- `mba.h`: `variantCount()` (~line 611), `scratchCount()` (~line 540), `generateMbaSequence()` (~line 1453)
- `config.h`: add `mba_basis_vars`, `mba_nested_basis`, `mba_chain` to PeckerConfig
- `args.h`: parse `--mba-basis-vars`, `--mba-nested-basis`, `--mba-chain`; update `--shizo` preset to enable `basis_vars=3, nested_basis=true, chain=true`
- `pipeline.h` (~line 337): add new fields to `MbaConfig{}` aggregate init
- `cmd_protect.h` (~line 1184): add new fields to `MbaConfig{}` aggregate init
- `project_file.h`: serialize/deserialize new fields
- GUI headers: add to ObfuscationConfigView (if applicable)

## Sub-tasks
- [ ] Update `variantCount()`: ADD/SUB/XOR/AND return 8 on pass 0 when basis_vars>=3; OR returns 7
- [ ] Update `scratchCount()`: V6/V7 return 4 scratch registers
- [ ] Update `generateMbaSequence()`: accept MbaConfig ref, add case 6/7 dispatch, load z register before 3-var expansion
- [ ] Add 3 new fields to MbaConfig struct with backwards-compatible defaults
- [ ] Update PeckerConfig in config.h with mba_basis_vars, mba_nested_basis, mba_chain
- [ ] Update args.h: parse --mba-basis-vars, --mba-nested-basis, --mba-chain; update --shizo preset
- [ ] Update pipeline.h and cmd_protect.h MbaConfig{} aggregate initializations
- [ ] Update project_file.h: serialize/deserialize new fields
- [ ] Update GUI headers if applicable


## Relations
- [blocked by mba-3-variable-expansion-functions](mba-3-variable-expansion-functions.md)

