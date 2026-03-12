---
created: 2026-03-11T22:54:34.388Z
updated: 2026-03-12T10:25:23.643Z
priority: high
tags:
  - bug
  - chained
  - all-harden
  - pass-interaction
---

# Chained + all_harden: pass interaction crashes

Chained dispatch mode crashes across multiple test suites:

**pecker_chained** (12 tests):
- `all_harden_golden_*` - various exit codes (0x80000002/3/4, 0xC0000005)

**pecker_e2e_protect_run** (3 selective golden + 1 multi_func):
- `selective_golden_fibonacci_only_main_chained` - timeout
- `selective_golden_bubble_sort_chained` - 0xC0000005 access violation
- `selective_golden_arithmetic_gcd_obfuscated_chained` - 0x80000003 breakpoint
- `golden_rule_multi_func_all_passes_chained` - 0xC000001D illegal instruction

**pecker_bin2bin_dll** (1 test):
- `dll_golden_rule_all_passes_chained` - 0x80000003

**pecker_bin2bin_timing_check** (1 test):
- `timing_check_with_junk_fibonacci_chained` - 0x80000003
