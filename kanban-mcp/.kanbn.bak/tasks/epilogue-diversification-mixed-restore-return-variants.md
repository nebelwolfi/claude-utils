---
created: 2026-03-11T16:26:18.274Z
updated: 2026-03-11T16:26:32.838Z
priority: low
tags:
  - entry-stub
  - anti-pattern-matching
  - anti-ida
---

# Epilogue Diversification (Mixed Restore + Return Variants)

**Problem**: Every stub epilogue follows the same pattern: `MOV RAX, [RSP+32]` → `ADD RSP, ~29KB` → 8 POPs → RET. This is a recognizable signature, especially the 8 POPs.

**Solution**: Partially addressed by the mixed PUSH/MOV task (some registers restored via MOV before ADD RSP, reducing POP count). Additional improvements:

1. **Return value extraction variants** (selected by diversity seed):
   - `MOV RAX, [RSP+ctx_base]` (baseline)
   - `LEA RCX, [RSP+ctx_base]; MOV RAX, [RCX]` (indirect)
   - `PUSH QWORD [RSP+ctx_base]; POP RAX` (stack-based)

2. **Junk between POPs**: Insert dead instructions between POP instructions, same as currently done between PUSHes.

3. **Mixed restore naturally diversifies**: With 3-5 PUSHes and 3-5 MOV-saves, the epilogue becomes a mix of `MOV reg, [RSP+off]` restores + `ADD RSP` + 3-5 POPs, which looks much more like normal compiler output.

**Key file**: `include/PEcker/stub/entry_stub.h` - add return value extraction variants, junk between POPs.

## Sub-tasks
- [ ] Add 3 return value extraction variants selected by diversity seed
- [ ] Add junk instruction insertion between POP instructions in epilogue
- [ ] Verify unwind info is not affected by epilogue changes (epilogue is outside prolog region)
- [ ] Unit test: verify all 3 return variants produce correct RAX value


## Relations
- [blocked by mixed-push-mov-register-saves-pdata-camouflage](mixed-push-mov-register-saves-pdata-camouflage.md)

