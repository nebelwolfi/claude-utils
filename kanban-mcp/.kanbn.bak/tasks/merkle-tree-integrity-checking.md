---
created: 2026-03-04T13:28:01.152Z
updated: 2026-03-04T13:28:01.152Z
tags:
  - anti-analysis
  - integrity
  - merkle-tree
  - tamper-detection
---

# Merkle-Tree Integrity Checking

## Overview
Replace single CRC32 checksum with a Merkle tree over bytecode blocks. Enables granular tamper detection and efficient incremental verification (O(log N) per block check).

## Files
- **Create**: `include/PEcker/anti_analysis/merkle_tree.h`
- **Create**: `tests/merkle_tree_tests.cpp`
- **Modify**: `config.h`, `anti_analysis.h`, `cmd_protect.h` (section layout: MerkleTreeDirectory + tree blobs), `args.h`, `config_loader.h`
- **Optional**: `re_randomize.h` (rebuild tree after opcode remap)

## Hash Function: FNV-1a 64-bit (default)
- Already in shared lib (`fnv64`), ~100x faster than SHA-256
- Domain-separated seeds: `MERKLEAF` for leaves, `MERKNODE` for internal nodes
- Optional `PECKER_MERKLE_HASH_SHA256` compile-time toggle for crypto-strength
- Node digest: 8 bytes (FNV) or 32 bytes (SHA-256)

## Tree Structure
- Complete binary tree in array form (no pointers)
- Leaf = hash of 256-byte bytecode block (configurable `PECKER_MERKLE_BLOCK_SIZE`)
- Pad to next power-of-two leaves with zero-hash sentinels
- Parent/child by index arithmetic: parent=(i-1)/2, left=2i+1, right=2i+2

## Verification Modes
1. **Full verify on startup**: Recompute all leaves + rebuild tree + compare root. ~50us for 50KB bytecode.
2. **Incremental per-block**: O(log N) walk from leaf to root. ~100-200ns per check. Every 256 instructions.
3. **Range verify**: Check subset of blocks covering currently executing region.
4. **Optional background thread**: Random block verification with 1-10ms jitter.

## Section Layout
- `MerkleTreeDirectory` (N × 8 bytes): per-function tree offset + size
- Followed by serialized tree blobs: `[MerkleTreeHeader][MerkleDigest nodes[...]]`
- Trees hash **encrypted** bytecode (verify without decrypting)

## Re-randomization interaction
- After opcode remap, tree must be rebuilt (same allocation, only digests change)

## Storage overhead: ~8% of bytecode size (FNV mode)
- 10KB bytecode → ~1KB tree. 100KB → ~8KB tree.
- ~23 test cases

## Sub-tasks
- [ ] Create merkle_tree.h: MerkleTreeHeader, buildMerkleTree(), hashLeaf/hashNode with domain separation
- [ ] Implement verifyFull() for startup validation
- [ ] Implement verifyBlock() for O(log N) incremental checks
- [ ] Implement verifyRange() for partial region checks
- [ ] Modify cmd_protect.h: append MerkleTreeDirectory + tree blobs after bytecodes in section layout
- [ ] Add PECKER_ENABLE_MERKLE_INTEGRITY + config fields + CLI flags
- [ ] Integrate into anti_analysis.h aggregate
- [ ] Optional: modify re_randomize.h to rebuild trees after opcode remap
- [ ] Optional: background thread verifier with jitter
- [ ] Create tests/merkle_tree_tests.cpp (~23 tests incl. tamper detection)

