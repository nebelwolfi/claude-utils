---
created: 2026-03-07T22:57:09.934Z
updated: 2026-03-09T11:17:09.545Z
started: 2026-03-08T10:05:03.602Z
completed: 2026-03-09T11:16:47.787Z
---

# Harden HandlerMutationPass

Three improvements: per-function opcode permutation, encrypted inverse map, and opcode aliasing.

## Improvement 1: Per-Function Opcode Permutation

Single global map means recovering one function's mapping reveals all.
- ~~Per-function seed: `func_seed = masterSeed ^ (funcIndex * 0x9E3779B97F4A7C15)`~~ DONE
- ~~Extract mutation from shared pipeline; apply per-function in the loop~~ DONE
- ~~Section layout: N * 256 bytes (one inverse map per function) instead of single 256-byte blob~~ DONE
- ~~Each entry stub LEAs to its own 256-byte slice: `inverse_map_offset + i * 256`~~ DONE
- ~~Chained mode: N separate dispatch_offsets[256x4] arrays (one per function)~~ DONE (per-handler tables forced off when per-func mutation active)
- ~~Flow-sensitive and encryption passes need per-function inverse_map reference~~ DONE

## Improvement 2: Encrypted Inverse Map in Interpreter

~~The 256-byte inverse map is cleartext in memory - dump reveals all opcode mappings.~~ DONE
- ~~XOR each entry with 16-byte key: `canonical = encrypted_inverse[raw] ^ key[raw & 15]`~~ DONE
- ~~Add `uint8_t inverse_map_key[16]` to FlatVmContext (16 bytes)~~ DONE
- ~~Entry stub writes key bytes as 2x MOV QWORD immediates (~20 bytes per stub)~~ DONE
- ~~Hot path cost: ~1-2 cycles (1 XOR + 1 byte load from L1 cache)~~ DONE
- ~~Build-time: XOR inverse_map with per-function keys in section data~~ DONE
- ~~Fixed pre-existing stub_metamorph.h CTX_SIZEOF mismatch (12888 → 13480)~~ DONE

## Improvement 3: Opcode Aliasing

202 of 256 byte values are unused (identity-mapped to error handler).
- ~~Assign all 202 unused slots as aliases for the 54 real opcodes (~3-4 aliases each)~~ DONE
- ~~ALL 256 inverse_map entries map to valid canonical opcodes (no error fallthrough)~~ DONE
- ~~Build-time: randomly choose among aliases when encoding each instruction~~ DONE
- Chained dispatch: all 256 dispatch_offsets point to real handlers (no error handler entries)
- Analyst cannot distinguish primary encodings from aliases

## Key Files

- `include/PEcker/common/opcode_map.h` - extend with aliases, per-function gen, encrypted map
- `include/PEcker/obfuscation/handler_mutation.h` - per-function apply + alias emission
- `include/PEcker/commands/cmd_protect.h` - N*256 inverse maps, per-function dispatch tables
- `include/PEcker/vm/vm_engine_flat.h` - encrypted inverse map decryption in hot path
- `include/PEcker/stub/entry_stub.h` - per-function LEA targets + key embedding
- `include/PEcker/vm/chained_handlers.h` - per-function dispatch_offsets

## Implementation Order

1. ~~Opcode aliasing (least invasive, no ABI/layout changes)~~ DONE
2. ~~Per-function permutation (section layout change)~~ DONE
3. ~~Encrypted inverse map (FlatVmContext ABI change, requires PIC blob rebuild)~~ DONE
