---
created: 2026-03-11T22:54:14.695Z
updated: 2026-03-11T22:54:14.695Z
tags:
  - lifter
  - sse
  - float
  - new-instruction
---

# Lifter: SSE/float instruction support

4 golden rule test failures in `float_sse` corpus. SSE/float instructions are not lifted by the x86 lifter. Need to add support for common SSE instructions (MOVSS, MOVSD, ADDSS, MULSD, CVTSI2SD, etc.).
