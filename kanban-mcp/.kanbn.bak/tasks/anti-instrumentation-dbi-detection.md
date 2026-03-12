---
created: 2026-03-04T13:24:38.846Z
updated: 2026-03-06T11:27:41.577Z
started: 2026-03-06T11:22:49.828Z
completed: 2026-03-06T11:26:05.073Z
priority: high
tags:
  - anti-analysis
  - frida
  - pin
  - dynamorio
  - dbi
---

# Anti-Instrumentation / DBI Detection

## Overview

Detect Dynamic Binary Instrumentation frameworks: Frida, Intel Pin, DynamoRIO, and generic DBI indicators.

## Files

- **Create**: `include/PEcker/anti_analysis/anti_instrumentation.h`
- **Create**: `tests/anti_instrumentation_tests.cpp`
- **Modify**: `config.h`, `anti_analysis.h`, `args.h`, `loader_stub.h` (PIC module hash check), `cmd_protect.h`

## Detection Techniques

- **Frida**: Named pipe `\\.\pipe\frida*` via FindFirstFileA, `frida-agent*.dll` / `frida-gadget*.dll` in PEB module list, optional TCP port 27042
- **Intel Pin**: `pinvm.dll` in loaded modules, `PIN_ROOT` / `PIN_CRT_TZDATA` environment variables
- **DynamoRIO**: `dynamorio.dll` in modules, `drrun.exe` as parent process
- **Generic DBI**: RWX page scan (MEM_PRIVATE, threshold ≥ 3), TLS slot count anomaly (threshold ≥ 48), suspicious parent process

## Implementation

- Module scan: walk `PEB->Ldr->InMemoryOrderModuleList`, case-insensitive wide substring match using custom `wideContainsI()`
- Parent process: `NtQueryInformationProcess(ProcessBasicInformation)` → parent PID → Toolhelp snapshot → name match
- Only flag known DBI launchers (drrun.exe, pin.exe), NOT unknown parents (reduces false positives)
- Per-framework enable toggles in `AntiInstrumentationConfig`
- Loader stub: PIC module-hash DBI check in Step 8 block
- ~25 test cases (struct, bitmask, wide string matching, runtime no-crash, aggregate)

## Sub-tasks

- [x] Add PECKER_ENABLE_ANTI_INSTRUMENTATION to config.h
- [x] Create anti_instrumentation.h: module scan, pipe check, env check, RWX scan, parent check, TLS check
- [x] Implement PEB Ldr walk with wideContainsI() for module detection
- [x] Implement parent process verification via NtQueryInformationProcess
- [x] Implement RWX page scan with MEM_PRIVATE filter and threshold
- [x] Add PIC module-hash DBI check to loader_stub.h
- [x] Integrate into anti_analysis.h aggregate
- [x] Add --anti-instrumentation CLI flag + presets
- [x] Create tests/anti_instrumentation_tests.cpp (~25 tests)
