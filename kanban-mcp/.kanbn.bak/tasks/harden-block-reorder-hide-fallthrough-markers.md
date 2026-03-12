---
created: 2026-03-03T20:19:14.947Z
updated: 2026-03-03T20:19:14.947Z
tags:
  - hardening
  - block-reorder
---

# Harden: BlockReorder - hide fallthrough markers

Every fallthrough and conditional-jump block gets an explicit `VM_JMP` appended after reordering. An analyst can identify all inserted JMPs as reordering artifacts, revealing which blocks originally fell through.

## Changes

**1. Decoy JMPs on terminal blocks:**
Occasionally append unreachable JMP instructions even after HALT/RET blocks. This makes inserted JMPs indistinguishable from decoys.

**2. Variable-length trampolines:**
Instead of a bare `JMP target` (5 bytes), sometimes emit a longer trampoline:
- `NOP; NOP; JMP target` (7 bytes)
- `PUSH R; POP R; JMP target` (9 bytes - dead stack roundtrip + jump)
This varies the structure of each appended jump.

**3. Sometimes don't reorder adjacent blocks:**
If two originally-adjacent blocks end up adjacent after shuffling, don't insert a JMP (the fallthrough still works). Currently the pass always inserts JMP for non-terminal blocks regardless of final position. Check if the successor block is actually adjacent and skip the JMP.

**4. Insert decoy blocks:**
Add 1-2 unreachable blocks containing plausible-looking code (dead MOV sequences, comparisons) between real blocks. These inflate the apparent block count.

**Files:** `include/PEcker/obfuscation/block_reorder.h`

## Sub-tasks
- [x] Add decoy JMPs after terminal blocks (unreachable)
- [x] Implement variable-length trampolines (NOP padding, dead stack ops)
- [x] Skip JMP insertion when successor block is actually adjacent
- [x] Insert 1-2 unreachable decoy blocks with plausible code

