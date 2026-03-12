---
created: 2026-03-11T08:12:16.982Z
updated: 2026-03-11T08:12:46.487Z
tags:
  - hardening
  - cfg-flatten
  - existing-pass
  - encrypted-state-ids-done
completed: 2026-03-11T08:12:46.487Z
---

# Harden CFGFlattenPass

## Overview

Four improvements: encrypted state IDs, binary search dispatch, bogus/decoy states, and split (2-level) dispatcher.

## Improvement 1: Encrypted State IDs

State IDs are currently plaintext immediates in MOV_RI instructions.
- Claim R13 as key_reg; per-block keys derived from RNG
- `encrypted_state[i] = state_id[i] ^ key[i]`
- Prologue: `MOV_RI key_reg, key[entry]; MOV_RI state_reg, encrypted_state[entry]`
- Block epilogue: `MOV_RI key_reg, key[next]; MOV_RI state_reg, encrypted_state[next]`
- Dispatcher CMP entries use encrypted values
- Analyst must recover both key and encrypted state per block

## Improvement 2: Binary Search Dispatch

Replace O(n) linear CMP chain with O(log n) balanced BST.
- Sort blocks by state_id; build balanced BST
- Each node: `MOV_RI(10) + CMP(3) + JZ(5) + JL(5)` = 23 bytes
- For 8 blocks: 3 comparisons max vs 8 linear
- Optional bijective mixing function on state IDs before sorting
- New `emitBinarySearchDispatcher()` recursive method

## Improvement 3: Bogus States (Decoy Blocks)

Fake dispatcher entries jumping to unreachable decoy blocks.
- Generate N decoy state IDs (30-50% of real block count)
- Decoy block bodies: plausible ALU/MOV patterns, fake state transitions
- Shuffle decoy entries among real dispatcher entries
- Some decoys transition to other decoys (apparent loops/chains)
- `num_decoy_blocks` config field

## Improvement 4: Split Dispatcher (2-Level State Machine)

- High 32 bits = group_id (outer dispatcher), low 32 bits = block_id (inner)
- Outer: extract group via SHR, CMP chain for groups
- Per-group sub-dispatcher: extract block_id via AND mask, CMP chain
- Total comparisons: K + N/K (minimized at K = sqrt(N))
- For 16 blocks, 4 groups of 4: 8 comparisons vs 16

## Key Files

- `include/PEcker/obfuscation/cfg_flatten.h` - all 4 features implemented here
- `tests/obfuscation_tests.cpp` - 21+ new test cases

## Implementation Order

1. Encrypted state IDs (smallest change)
2. Bogus states (independent of #1)
3. Binary search dispatch (can combine with encrypted states)
4. Split dispatcher (most complex, restructures emission pipeline)
