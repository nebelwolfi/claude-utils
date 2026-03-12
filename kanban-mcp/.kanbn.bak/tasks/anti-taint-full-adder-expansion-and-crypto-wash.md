---
created: 2026-02-26T20:21:51.089Z
updated: 2026-03-02T11:59:37.629Z
started: 2026-02-27T20:08:50.770Z
completed: 2026-03-01T04:00:32.542Z
---

# AntiTaint: full-adder expansion and crypto-wash

Implement ADD/SUB bit-loop expansions with carry/borrow chain propagation. Full adder: sum_bit = a^b^carry, carry = (a&b)|(a&carry)|(b&carry). CryptoWash for MOV_RR: XOR-encrypt with random key, XOR-decrypt later.

## Relations

- [requires anti-taint-unit-test-suite](anti-taint-unit-test-suite.md)
