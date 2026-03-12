---
created: 2026-03-11T15:47:18.155Z
updated: 2026-03-11T15:47:18.156Z
priority: low
tags:
  - mba
  - expanded-targets
  - quick-win
---

# MBA: INC/DEC as MBA Targets

Add `VM_INC` and `VM_DEC` as MBA-targetable opcodes. These are trivially expressible as `ADD dst, 1` and `SUB dst, 1`, which then get the full MBA variant pool treatment.

**Current state**: `isMbaTarget()` at mba.h:44 only covers ADD/SUB/XOR/AND/OR/MOV_RR/NOT. INC (opcode 0x22) and DEC (opcode 0x23) are 2-byte instructions (`opcode + dst`) that map directly to ADD/SUB with an implicit immediate of 1.

**Approach**: Don't add new expand functions. Instead, in `applyOnce()` (~line 1633), when an INC/DEC is encountered:
1. Synthesize a `1` into a scratch register: `MOV_RI scratch, 1`
2. Emit an MBA expansion for `ADD dst, scratch` (for INC) or `SUB dst, scratch` (for DEC)
3. The scratch register gets the full PUSH/POP save/restore treatment

**Alternative simpler approach**: In the replacement generation, convert INC→ADD and DEC→SUB inline, then fall through to normal MBA expansion. This avoids special-casing in `generateMbaSequence`.

**Flag behavior**: INC/DEC preserve CF but set ZF/SF/OF. ADD/SUB set all flags including CF. The MBA expansion already generates flag-setting instructions, so the extra CF modification is acceptable (INC/DEC in x86 preserved CF for historical reasons; in the VM context this rarely matters since flags are recomputed by subsequent CMP/TEST).

**If flag preservation matters**: Add a `VM_ADD_NF` (no-flags ADD) variant that preserves the flag register, or save/restore RFLAGS around the expansion. This is a corner case - most lifted code doesn't depend on CF being preserved across INC/DEC.

**File**: `include/PEcker/obfuscation/mba.h`

## Sub-tasks
- [ ] Add VM_INC and VM_DEC to `isMbaTarget()` at mba.h:44
- [ ] In `applyOnce()` replacement loop (~line 1633): detect INC/DEC, synthesize scratch with MOV_RI 1, delegate to ADD/SUB MBA expansion
- [ ] Handle the 2-byte→3-byte instruction size difference (INC is 2 bytes: opcode+dst, but ADD needs dst+src)
- [ ] Consider CF flag preservation: document whether INC/DEC's CF-preserving semantics need explicit handling or if the flag difference is acceptable
- [ ] Add tests: INC/DEC with MBA, verify correct result for simple increment/decrement programs

