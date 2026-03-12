---
created: 2026-03-07T00:24:48.140Z
updated: 2026-03-07T00:25:09.422Z
completed: 2026-03-07T00:24:48.140Z
---

# Zero-Init Strategy Variation

Replace the single REP STOSQ zero-init (strong signature: F3 48 AB) with 5 strategies selected per-stub from diversity_seed.

**Strategies**:
0. **RepStosq** (current): LEA RDI; XOR EAX; MOV ECX, 1607; REP STOSQ - 15 bytes
1. **UnrolledMovLoop**: MOV QWORD [base+N*8], 0 in groups of 4/6/8 per iteration + counted loop - 55-70 bytes
2. **XorStoreLoop**: XOR reg,reg + MOV [base], reg + ADD base,8 + DEC + JNZ - 25-30 bytes. Variable zero register (RAX/RCX/R10/R11)
3. **AvxZero**: VPXOR YMM0 + VMOVDQU [base], YMM0 loop + VZEROUPPER - 29 bytes. Requires --allow-avx-stubs flag
4. **PartialInit**: Only zero fields read before first write. Audit shows only 312 bytes needed (offsets 0-263 + 12808-12855) vs 12,856 full. 97.6% reduction.

**Field audit for PartialInit**: registers[0-23] (192B, some read as operands), stack_top (4B), exception_frame_count (4B), status (1B) must be zero. Fields explicitly set by stub (bytecode, size, keys, etc.) don't need pre-zeroing. stack[1024], exception_frames[16], decrypted_buf[4096] are written before read - skip.

**Register constraints**: Can clobber RAX, RCX, RDI, RSI, YMM0. Must NOT touch R8, R9, R10, R11 (hold args).

**.pdata**: Unaffected - prolog_size recorded before zero-init code.

**Key files**: entry_stub.h (strategies + dispatcher), vm_engine_flat.h (field audit reference), config.h (allow_avx_stubs flag)
