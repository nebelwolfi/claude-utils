---
created: 2026-03-04T13:30:29.119Z
updated: 2026-03-04T13:30:29.119Z
tags:
  - anti-analysis
  - runtime-integrity
  - anti-ROP
  - stack-validation
---

# Stack Return Address Validation

## Overview
Periodically validate that native stack return addresses point within the `.pecker` section (or other legitimate code regions), detecting ROP chains, stack buffer overflows, and debugger-injected return address modifications. This is a runtime integrity check performed inside the VM interpreter.

## Approach: Interpreter-Inline Periodic Validation
Add return address validation directly into the VM interpreter's instruction dispatch loop. Every N instructions (configurable), walk the native stack frames and verify return addresses fall within expected ranges.

## Mechanism
1. **Range registration**: Entry stub writes `.pecker` section base and size into FlatVmContext before calling interpreter
2. **Periodic check**: Every `srav_check_interval` instructions, the interpreter:
   - Reads `__builtin_return_address(0)` (or `_ReturnAddress()`)
   - Optionally walks 2-3 stack frames via frame pointer chain
   - Verifies each return address falls within `[valid_range_base, valid_range_base + valid_range_size)`
   - On failure: corrupt VM state and jump to decoy handler (anti-tamper response)
3. **Pre-NATIVE_CALL check**: Before every `NATIVE_CALL` instruction (which transitions to real x86-64 code), validate the return path
4. **Anti-tamper response**: On detection, don't crash immediately - silently corrupt the register file or bytecode pointer to cause delayed, hard-to-diagnose failure

## FlatVmContext Additions
```cpp
// Add to FlatVmContext struct:
uint64_t valid_range_base;      // .pecker section VA base
uint64_t valid_range_size;      // .pecker section size
uint32_t srav_check_interval;   // check every N instructions (default: 64)
uint32_t srav_counter;          // counts down to next check
```
**CTX_SIZEOF impact**: +24 bytes (two uint64_t + two uint32_t). Must update `entry_stub.h` offset constants.

## Architecture

### New File: `include/PEcker/anti_analysis/stack_return_validation.h`
```
StackReturnValidationConfig {
    bool enabled;
    uint32_t check_interval;     // instructions between checks
    uint8_t stack_depth;         // how many frames to walk (1-4)
    bool check_before_native;    // validate before NATIVE_CALL
    bool silent_corruption;      // corrupt state vs immediate halt
}

StackReturnValidationResult {
    bool checked;
    bool violation_detected;
    uint64_t bad_address;        // first invalid return address
    uint8_t frame_depth;         // which frame failed
    bool isClean() const;
}
```

### Integration Points

#### `vm_engine_flat.h` (PIC interpreter)
- In dispatch loop, decrement `ctx->srav_counter`; when 0, call inline validation
- Validation is inline (no function call - PIC constraint): read return address, range-check, reset counter
- Before `OP_NATIVE_CALL` handler: unconditional validation check
- On failure: `ctx->ip += random_offset` (silent corruption) or `__debugbreak()` (loud)

#### `entry_stub.h`
- After writing bytecode pointer and key, write `valid_range_base` and `valid_range_size` from section layout
- Write `srav_check_interval` (from config) and initialize `srav_counter` to same value
- Update CTX_SIZEOF and all field offset constants (+24 bytes)

#### `chained_handlers.h`
- Add counter decrement + range check to handler chain preamble
- On violation: emit `INT3` or corrupt handler chain pointer

#### `vm_engine.h` (non-flat interpreter)
- Add same periodic check in `executeProgram()` dispatch loop
- Use `_ReturnAddress()` intrinsic

#### `vm_context.h`
- Add new fields to VmContext struct (non-flat version)

#### `config.h`
- `PECKER_ENABLE_STACK_RETURN_VALIDATION` toggle (default: 1)

#### `cmd_protect.h`
- Pass section base/size to entry stub generator
- Add config propagation

#### `args.h`
- `--srav` / `--no-srav` flags
- `--srav-interval N` (default 64)
- `--srav-depth N` (default 2)
- `--shizo` enables with interval=16, depth=4
- `--weak` disables

## PIC Constraints
The validation code in `vm_engine_flat.h` must be fully position-independent:
- No function calls (inline everything)
- `__builtin_return_address(0)` compiles to a single instruction
- Frame walking via RBP chain: `*(uint64_t*)(rbp + 8)` for return addr, `*(uint64_t*)rbp` for next frame
- Range check is simple: `addr >= base && addr < base + size`

## Testing (~10 test cases)
- Valid return addresses pass check (normal execution)
- Return address outside .pecker range triggers detection
- Counter correctly counts down and resets
- Pre-NATIVE_CALL check fires
- Silent corruption mode corrupts IP without crashing immediately
- Frame walking correctly reads 1/2/3/4 frames deep
- Config toggle enables/disables correctly
- Integration: protected binary with SRAV runs correctly when not tampered
- Edge cases: check_interval=1 (every instruction), stack_depth=0 (skip walk)

## Sub-tasks
- [ ] Create `include/PEcker/anti_analysis/stack_return_validation.h` with Config and Result structs
- [ ] Add `valid_range_base`, `valid_range_size`, `srav_check_interval`, `srav_counter` fields to FlatVmContext in `vm_engine_flat.h`
- [ ] Update CTX_SIZEOF and all field offset constants in `entry_stub.h` (+24 bytes)
- [ ] Implement inline return address validation in PIC interpreter dispatch loop (counter decrement + range check)
- [ ] Implement pre-NATIVE_CALL validation check in `vm_engine_flat.h`
- [ ] Implement frame pointer chain walking (RBP-based, configurable depth 1-4)
- [ ] Implement anti-tamper response: silent IP/register corruption mode vs loud INT3
- [ ] Update `entry_stub.h` generateEntryStub() to write valid_range_base/size and srav fields to FlatVmContext
- [ ] Add counter decrement + range check to chained handler preamble in `chained_handlers.h`
- [ ] Add periodic check to non-flat interpreter in `vm_engine.h` executeProgram() loop
- [ ] Add fields to VmContext in `vm_context.h` (non-flat version)
- [ ] Add `PECKER_ENABLE_STACK_RETURN_VALIDATION` to `config.h` with default=1 and stub fallback
- [ ] Add `--srav` / `--no-srav`, `--srav-interval`, `--srav-depth` CLI flags to `args.h`
- [ ] Wire into `--shizo` (interval=16, depth=4) and `--weak` (disabled) presets
- [ ] Pass section base/size through `cmd_protect.h` pipeline to entry stub generator
- [ ] Write unit tests: valid return addresses pass, invalid addresses trigger detection
- [ ] Write unit tests: counter countdown and reset logic
- [ ] Write unit tests: frame walking at depths 1-4
- [ ] Write integration test: protected binary with SRAV runs correctly under normal execution

