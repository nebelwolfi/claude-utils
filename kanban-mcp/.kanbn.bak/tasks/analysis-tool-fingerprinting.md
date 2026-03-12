---
created: 2026-03-04T13:24:56.700Z
updated: 2026-03-06T11:51:29.583Z
started: 2026-03-06T11:22:49.349Z
completed: 2026-03-06T11:50:37.709Z
tags:
  - anti-analysis
  - tool-detection
  - fnv1a
---

# Analysis Tool Fingerprinting

## Overview

Detect running reverse engineering tools by fingerprinting window classes, process names, loaded drivers, parent processes, and debugger mutexes - all via FNV1a hashes (no plaintext strings in binary).

## Files

- **Create**: `include/PEcker/anti_analysis/tool_fingerprint.h`
- **Create**: `tests/tool_fingerprint_tests.cpp`
- **Modify**: `config.h`, `anti_analysis.h`, `args.h`, `config_loader.h`, `anti_analysis_config_view.h`, `anti_analysis_panel.h`, `project_file.h`

## Detection Vectors

1. **Window classes**: EnumWindows + GetClassNameA → FNV1a hash → compare (OLLYDBG, ID, X64DBG, WinDbgFrameClass, etc.)
2. **Process names**: TH32CS_SNAPPROCESS → hash szExeFile (ida64.exe, x64dbg.exe, ghidra.exe, ProcessHacker.exe, wireshark.exe, etc. - 17 targets)
3. **Loaded drivers/DLLs**: PEB→Ldr walk → fnv1aw() wide hash (dbghelp.dll, SbieDll.dll, cmdvrt64.dll)
4. **Parent process**: NtQueryInformationProcess → resolve parent name → hash (cmd.exe, python.exe, powershell.exe)
5. **Debugger mutexes**: OpenMutexA with oxorany()-obfuscated names (DBWinMutex)

## Key Design

- All tool names stored as precomputed `hash_fnv1a()` compile-time constants - never plaintext
- User-extensible via `extra_*_hashes` arrays in `ToolFingerprintConfig`
- EnumWindows callback: static function with LPARAM context pointer (freestanding-safe)
- Wide-char module names use `fnv1aw()`, narrow process names use `fnv1a()`
- ~16 test cases including hash collision verification

## Sub-tasks

- [x] Add PECKER_ENABLE_TOOL_FINGERPRINT to config.h
- [x] Create tool_fingerprint.h: hash tables, 5 detection vectors, config/result structs
- [x] Implement window class scan via EnumWindows + hash compare
- [x] Implement process name scan via Toolhelp snapshot + hash compare
- [x] Implement PEB Ldr walk for driver/DLL hash fingerprinting
- [x] Implement parent process hash check
- [x] Integrate into anti_analysis.h aggregate
- [x] Add --tool-fingerprint CLI flag + GUI support
- [x] Create tests/tool_fingerprint_tests.cpp (~16 tests incl. hash collision checks)
