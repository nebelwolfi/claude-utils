---
created: 2026-03-03T19:55:34.100Z
updated: 2026-03-05T00:21:01.838Z
started: 2026-03-04T21:17:03.410Z
completed: 2026-03-04T21:19:03.094Z
tags:
  - mba
  - config
  - cli
---

# MBA: Config plumbing for mba_noise

Thread the new `mba_noise` config field through all integration points.

**`include/PEcker/cli/config.h` (~line 105):**
```cpp
float mba_noise = 0.0f;   // noise term insertion probability (0.0-1.0)
```

**`include/PEcker/cli/args.h`:**
- Add `--mba-noise <float>` parsing (after `--mba-density` block, ~line 446):
```cpp
if (detail::streq(arg, "--mba-noise")) {
    if (i + 1 >= argc) return std::unexpected(...);
    cfg.mba_noise = strtof(argv[++i], nullptr);
    continue;
}
```
- Update `--shizo` preset (~line 234): `cfg.mba_noise = 0.8f;`
- Update `--weak` preset (~line 294): `cfg.mba_noise = 0.0f;`

**`include/PEcker/cli/pipeline.h` (line 333-334):**
```cpp
mba_pass = MbaTransformPass(MbaConfig{
    cfg.mba_depth, cfg.mba_density, mba_seed, cfg.mba_noise
});
```

**`include/PEcker/commands/cmd_protect.h` (line 1170-1171):**
```cpp
state.mba_pass = MbaTransformPass(MbaConfig{
    cfg.mba_depth, cfg.mba_density, mba_seed, cfg.mba_noise
});
```

**Files:** `config.h`, `args.h`, `pipeline.h`, `cmd_protect.h`

## Sub-tasks

- [x] Add mba_noise to PeckerConfig in config.h
- [x] Add --mba-noise parsing in args.h
- [x] Update --shizo and --weak presets in args.h
- [x] Update MbaConfig construction in pipeline.h
- [x] Update MbaConfig construction in cmd_protect.h

## Relations

- [requires mba-dead-noise-term-insertion](mba-dead-noise-term-insertion.md)
