---
created: 2026-03-03T22:44:39.453Z
updated: 2026-03-04T23:58:09.556Z
started: 2026-03-03T22:44:39.453Z
completed: 2026-03-03T22:48:34.999Z
---

# MBA: Dead noise term insertion

Add configurable noise term insertion that adds identity-preserving dead expressions after the core MBA expansion.

**New config field in `MbaConfig`:**
```cpp
float noise_density = 0.0f;  // probability of inserting noise per expansion (0.0-1.0)
```
Add at end of struct so existing 3-arg aggregate initialization still works.

**Noise term implementation** - uses two's complement identity `x + (-x) = 0`:
```cpp
void emitNoiseTerm(std::vector<u8>& v, RegId dst, RegId noise_scratch,
                   std::mt19937& rng) {
    // Pick a random register to base the noise on
    std::uniform_int_distribution<u8> reg_dist(0, 15);
    RegId noise_src = static_cast<RegId>(reg_dist(rng));

    vPush(v, noise_scratch);
    vMovRR(v, noise_scratch, noise_src);   // S = R
    vNot(v, noise_scratch);                // S = ~R
    vInc(v, noise_scratch);                // S = ~R + 1 = -R
    vAlu(v, Opcode::VM_ADD, noise_scratch, noise_src);  // S = -R + R = 0
    vAlu(v, Opcode::VM_ADD_NF, dst, noise_scratch);     // dst += 0 (no flag clobber)
    vPop(v, noise_scratch);
}
```

**Add `vInc` helper:**
```cpp
static inline void vInc(std::vector<u8>& v, RegId r) {
    vEmit(v, static_cast<u8>(Opcode::VM_INC));
    vEmitReg(v, r);
}
```

**Insertion point:** After core expansion, before scratch register POP. Uses `VM_ADD_NF` (opcode 0x0B) to avoid clobbering flags set by the expansion's final instruction.

The noise scratch register reuses `s0` which is already saved by the outer PUSH.

**Files:** `include/PEcker/obfuscation/mba.h`

## Sub-tasks

- [x] Add noise_density field to MbaConfig (at end of struct)
- [x] Add vInc helper function
- [x] Implement emitNoiseTerm function
- [x] Wire noise insertion into generateMbaSequence (after expansion, before POP)

## Relations

- [requires mba-variant-selection-dispatch-generate-mba-sequence-rewrite](mba-variant-selection-dispatch-generate-mba-sequence-rewrite.md)
