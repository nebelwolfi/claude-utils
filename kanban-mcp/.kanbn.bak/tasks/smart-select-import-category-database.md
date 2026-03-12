---
tags:
  - infrastructure
  - tier-1
created: 2026-02-26T09:49:51.896Z
started: 2026-02-26T09:49:51.896Z
updated: 2026-03-03T00:27:02.359Z
completed: 2026-02-26T11:00:07.631Z
---

# SmartSelect: Import Category Database

Define ImportCategory enum and categorized Windows API name tables. Categories: CryptoApi, Registry, Network, AntiDebug, HWID, ProcessIntegrity, Timing. Each API name mapped to its category for IAT-based scoring. Implemented in include/PEcker/analysis/import_engine.h (database portion).

## Sub-tasks

- [x] Define ImportCategory enum with 7+ categories
- [x] Build API name tables: CryptAcquireContext/BCryptEncrypt (crypto), RegOpenKeyEx (registry), HttpSendRequest/connect (network), IsDebuggerPresent (anti-debug), GetVolumeInformation (HWID), VirtualProtect (process), GetTickCount (timing)
- [x] Implement categorizeImport(dll_name, func_name) -> ImportCategory lookup
- [x] Handle both A/W suffixed API variants (e.g. RegOpenKeyExA and RegOpenKeyExW)
- [x] Unit tests for import categorization
- [x] Add FileIO category: GetEnvironmentVariable, CreateFileW/A, ReadFile, WriteFile (license file readers)
- [x] Add SEH category: RtlAddVectoredExceptionHandler, AddVectoredExceptionHandler, SetUnhandledExceptionFilter (anti-debug tricks)
