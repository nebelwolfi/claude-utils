---
created: 2026-03-11T11:16:43.048Z
updated: 2026-03-12T00:51:27.456Z
started: 2026-03-11T12:45:27.457Z
completed: 2026-03-12T00:50:10.728Z
---

# Harden Algebraic Obfuscation Passes

## Overview

Harden MbaTransformPass, OpaqueConstantPass, and PolymorphicPass with solver-resistant techniques.

## Completed

1. ✅ Extract scratch_pool.h utility (#1)
2. ✅ Variable scratch registers in OpaqueConstant (#2)
3. ✅ Variable scratch registers in Polymorphic (#3)
4. ✅ Hardened noise in MBA (#4)
5. ✅ Runtime opaque predicate noise (#5)
6. ✅ Wire --mba-opaque-noise CLI flag (#6)
7. ✅ ComposedAlgebraicPass (#7) - also fixed Poly MOV_RR dst==src bug

## Key Files

- `include/PEcker/obfuscation/mba.h` - hardened noise + runtime opaque noise
- `include/PEcker/obfuscation/polymorphic.h` - parameterized variants, MOV_RR alias fix
- `include/PEcker/obfuscation/opaque_constants.h` - parameterized strategies
- `include/PEcker/obfuscation/scratch_pool.h` - shared scratch register utility
- `include/PEcker/obfuscation/composed_algebraic.h` - composite pass
