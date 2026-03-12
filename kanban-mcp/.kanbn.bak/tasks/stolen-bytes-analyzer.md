---
created: 2026-02-26T20:22:18.881Z
updated: 2026-03-02T11:43:35.465Z
started: 2026-02-27T20:09:23.697Z
completed: 2026-02-28T07:13:11.363Z
---

# Stolen bytes: analyzer

Create include/PEcker/protection/stolen_bytes.h. analyzeStolenBytes() uses HDE64 via DisasmInstruction wrappers to walk instructions from function entry. Stops at branch/call/ret/INT3/max_steal. Records RIP-relative displacement offsets via findRipDispOffset(). Returns StolenBytesInfo with feasibility check (steal_length >= 5).
