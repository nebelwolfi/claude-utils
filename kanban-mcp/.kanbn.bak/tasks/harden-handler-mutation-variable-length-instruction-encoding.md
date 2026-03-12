---
created: 2026-03-03T20:18:29.155Z
updated: 2026-03-12T10:51:25.028Z
started: 2026-03-12T09:06:04.317Z
priority: high
tags:
  - hardening
  - handler-mutation
  - encoding
---

# Harden: HandlerMutation - variable-length instruction encoding

HandlerMutation only permutes the opcode byte. Instruction sizes are deterministic and unchanged - linear disassembly still works perfectly because `instrSize()` is predictable.

## Changes

**1. Variable-length encoding for MOV_RI (highest impact):**
MOV_RI is always 10 bytes. Offer alternative encodings:
- **Compact (6 bytes):** For values that fit in 32 bits: `MOV_RI_32 reg, imm32` (new opcode). Zero-extend to 64.
- **Normal (10 bytes):** Current `MOV_RI reg, imm64`.
- **Expanded (14-18 bytes):** Prefix with 1-4 NOP bytes + suffix with 1-4 NOP bytes. Or split into two MOV_RI_32 for upper/lower halves combined with SHL+OR.

Randomly select encoding per instruction based on value range and RNG.

**2. Instruction padding:**
For any instruction, optionally prefix with 1-3 NOP bytes. This shifts all subsequent instruction boundaries, defeating linear sweep that assumes fixed instruction sizes.

**3. Operand encoding variants:**
For 2-register instructions (ADD, SUB, XOR, etc.), occasionally encode using an alternative form that takes more bytes. E.g., `ADD R0, R1` (3 bytes) could alternatively be encoded as `PUSH R1; POP Rtemp; ADD R0, Rtemp` (7 bytes) where Rtemp is a scratch register.

Note: This requires adding the new compact opcode `MOV_RI_32` to the opcode table and VM interpreter, or using the existing NOP opcode for padding.

**Files:** `include/PEcker/obfuscation/handler_mutation.h`, `include/PEcker/common/opcodes.h` (if adding new opcodes), `include/PEcker/vm/vm_engine.h` (if adding new opcodes)

## Sub-tasks
- [ ] Design variable-length encoding scheme for MOV_RI (compact/normal/expanded)
- [ ] Implement random NOP padding before instructions
- [ ] Implement operand encoding variants (PUSH/POP alternative for reg-reg ops)
- [ ] Update instrSize handling for new encoding forms
- [ ] Integrate with handler mutation pass (apply encoding variance before opcode permutation)

