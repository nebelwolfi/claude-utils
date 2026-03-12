---
created: 2026-02-26T20:20:26.576Z
updated: 2026-03-03T00:44:01.183Z
started: 2026-02-26T22:53:30.514Z
completed: 2026-02-26T23:08:00.569Z
---

# Nanomite: pipeline and CLI integration

Wire NanomitePass into cmd_protect.h PipelineState, configurePipeline() (pass name nanomite, flag 0x800). Add --nanomite, --nanomite-density, --nanomite-false-density to args.h and config.h. Serialize nanomite_table into .pecker section per function. Update cmd_dump.h/cmd_trace.h for NANOMITE mnemonic display.

## Relations

- [requires nanomite-obfuscation-pass](nanomite-obfuscation-pass.md)
- [requires nanomite-vm-interpreter-handler](nanomite-vm-interpreter-handler.md)
