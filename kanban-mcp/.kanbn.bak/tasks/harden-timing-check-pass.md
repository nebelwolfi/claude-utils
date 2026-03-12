---
created: 2026-03-04T14:05:49.827Z
updated: 2026-03-07T11:59:45.708Z
started: 2026-03-07T08:11:03.541Z
completed: 2026-03-07T11:45:54.291Z
tags:
  - hardening
  - timing-check
  - existing-pass
---

# Harden TimingCheckPass

## Overview

Three improvements: multiple timing sources with cross-validation, statistical anomaly detection, and interleaved dispatch loop checks.

## Improvement 1: Multiple Timing Sources

Single RDTSC is trivially spoofed. Use four independent sources.
- **RDTSC**: inline `0F 31` (PIC, no syscall)
- **QPC**: NtQueryPerformanceCounter via lazy_call (hookable but different path)
- **TickCount64**: direct read from KUSER_SHARED_DATA at `0x7FFE0320` (kernel-mode to spoof)
- **SystemTime**: direct read from KUSER_SHARED_DATA at `0x7FFE0014` (kernel-mode to spoof)
- `TimingSnapshot` struct with all 4 values
- Cross-validate: normalize to microseconds, compute pairwise ratios
- Mismatch if ratio > 10x for 2+ pairs (debugger inflates one but not others)
- Loader stub: use RDTSC + KUSER_SHARED_DATA (2 sources, PIC-safe)

## Improvement 2: Statistical Detection

Single threshold comparison is defeated by careful RDTSC tuning.
- Circular buffer of 32 timing samples per source in FlatVmContext
- IQR-based anomaly detection (robust to context switch outliers):
  - Sort 32 samples, compute median and IQR
  - Flag if 3+ consecutive samples have modified Z-score > 3.0
  - Also flag if IQR < MIN_IQR_THRESHOLD (suspiciously low variance = spoofed)
- Insertion sort on 32 elements: ~500-1000 cycles, amortized negligible
- Accumulates across VM entries (global context persists)

## Improvement 3: Interleaved Timing Checks in Dispatch Loop

Currently no timing checks during VM execution.
- Add FlatTimingState to FlatVmContext (~576 bytes appended at end)
- `FLAT_TIMING_CHECK()` macro alongside existing `FLAT_CYCLE_CHECK()`
- Every `check_interval` instructions: RDTSC + record sample + check anomaly
- Fast path: u32 increment + compare (~2-3 cycles/instruction)
- Slow path: RDTSC + buffer write (~30 cycles every N instructions)
- Anomaly check: every 32 samples (~500 cycles every 32*N instructions)
- Total overhead: < 0.5% of VM execution time
- Chained mode: inline RDTSC increment/compare in emitDispatchNext() (subset of handlers to reduce bloat)
- New `FLAT_VM_STATUS_TAMPER_DETECTED = 8` status code

## FlatVmContext Impact

- New FlatTimingState: rdtsc_samples[32], qpc_samples[32], sample_index, sample_count, running sums, last_rdtsc, last_qpc, qpc_frequency, check_interval, instr_since_check, timing_flags, tamper_detected
- Total: ~576 bytes appended at end. CTX_SIZEOF ~13432.

## Key Files

- `include/PEcker/anti_analysis/timing_check.h` - complete rewrite with multi-source + cross-validation
- `include/PEcker/vm/vm_engine_flat.h` - FlatTimingState, FLAT_TIMING_CHECK macro, inline functions
- `include/PEcker/stub/entry_stub.h` - CTX_SIZEOF update, RDTSC capture in entry prologue
- `include/PEcker/vm/chained_handlers.h` - inline timing check in emitDispatchNext()
- `tests/anti_analysis_tests.cpp` - 20+ new tests

## Sub-tasks

- [x] Write BIN2BIN tests for all 3 dispatch modes + chained
