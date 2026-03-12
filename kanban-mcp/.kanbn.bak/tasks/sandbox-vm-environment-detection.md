---
created: 2026-03-04T13:24:00.465Z
updated: 2026-03-05T12:06:24.349Z
started: 2026-03-05T10:17:40.833Z
completed: 2026-03-05T12:05:26.211Z
priority: high
tags:
  - anti-analysis
  - sandbox
  - vm-detection
---

# Sandbox / VM Environment Detection

## Overview

Detect execution inside VMware, VirtualBox, Hyper-V, KVM, QEMU, Xen, or analysis sandboxes via multiple detection vectors.

## Files

- **Create**: `include/PEcker/anti_analysis/vm_detect.h`
- **Create**: `tests/vm_detect_tests.cpp`
- **Modify**: `config.h`, `anti_analysis.h`, `args.h`, `config_loader.h`, `loader_stub.h` (PIC CPUID check), `anti_analysis_config_view.h`

## Detection Techniques

- **CPUID leaf 1**: ECX bit 31 (hypervisor present)
- **CPUID leaf 0x40000000**: 12-char vendor string (VMwareVMware, Microsoft Hv, KVMKVMKVM, etc.)
- **Registry artifacts**: VMware Tools, VBox Guest Additions, Hyper-V Guest Parameters keys
- **MAC OUI prefixes**: 08:00:27 (VBox), 00:0C:29 (VMware), 00:15:5D (Hyper-V), 52:54:00 (QEMU)
- **Driver/file artifacts**: vmmouse.sys, VBoxGuest.sys, vmci.sys via `GetFileAttributesA`
- **CPUID exit latency**: RDTSC around CPUID leaf 0 (VM exits ~5-10x slower)
- **SIDT/SGDT deliberately omitted** (unreliable on modern Win10/11 with VBS)

## False Positive Handling

- Windows 11 enables Hyper-V by default for VBS - `allow_hyperv` config flag
- Secondary check: `VirtualizationBasedSecurityStatus` registry value distinguishes bare-metal VBS from guest VM
- `allow_wsl` flag for WSL2 developers
- CLI: `--vm-detect`, `--vm-allow-hyperv`, `--vm-allow-wsl`

## Loader Stub

- Lightweight PIC CPUID leaf 1 bit 31 check (~14 bytes of machine code) in Step 8 anti-analysis block

## Sub-tasks

- [x] Add PECKER_ENABLE_VM_DETECT to config.h
- [x] Create vm_detect.h with VmDetectResult/Config, CPUID checks, registry/MAC/driver/timing checks
- [x] Implement Hyper-V/VBS false-positive mitigation (secondary registry check)
- [x] Add PIC CPUID hypervisor check to loader_stub.h (~14 bytes)
- [x] Integrate into anti_analysis.h aggregate
- [x] Add CLI flags --vm-detect, --vm-allow-hyperv, --vm-allow-wsl
- [x] Update GUI enum + panel
- [x] Create tests/vm_detect_tests.cpp (~20 tests incl. MAC OUI matching unit tests)
