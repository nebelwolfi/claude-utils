---
created: 2026-02-26T20:21:39.726Z
updated: 2026-03-02T17:36:40.901Z
started: 2026-02-27T20:08:11.033Z
completed: 2026-02-28T02:03:42.373Z
---

# AntiTaint: core implicit-flow pass

Create include/PEcker/obfuscation/anti_taint.h with AntiTaintPass. Replaces AND/XOR/OR/ADD/SUB/MOV_RR with bit-loop reconstruction: for each bit position, TEST source bit via conditional branch, OR result bit via constant. R14/R15 scratch with PUSH/POP. RFLAGS saved/restored. AntiTaintConfig: density, seed, strategy (BitLoop/CryptoWash/Random), max_bit_width, opcode_mask. Pipeline: after MBA, before Flatten.
