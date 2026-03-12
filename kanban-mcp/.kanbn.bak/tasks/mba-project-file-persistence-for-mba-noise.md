---
created: 2026-03-03T19:55:39.363Z
updated: 2026-03-05T00:28:21.826Z
started: 2026-03-04T21:21:06.736Z
completed: 2026-03-05T00:27:36.381Z
priority: low
tags:
  - mba
  - config
  - persistence
---

# MBA: Project file persistence for mba_noise

Add serialization/deserialization for `mba_noise` in the project file format.

**`include/PEcker/project/project_file.h`:**

In `PassPipeline` struct (~line 118):
```cpp
float mba_noise = 0.0f;
```

In serialization (~line 452):
```cpp
w.appendFloat("mba_noise", pf.pass_pipeline.mba_noise);
```

In deserialization (~line 590):
```cpp
tryGetFloat(json, json_len, "$.pass_pipeline.mba_noise", pf.pass_pipeline.mba_noise);
```

In `toPeckerConfig` (~line 812):
```cpp
cfg.mba_noise = pf.pass_pipeline.mba_noise;
```

**Files:** `include/PEcker/project/project_file.h`

## Sub-tasks

- [x] Add mba_noise to PassPipeline struct
- [x] Add serialization (appendFloat)
- [x] Add deserialization (tryGetFloat)
- [x] Add toPeckerConfig mapping

## Relations

- [requires mba-config-plumbing-for-mba-noise](mba-config-plumbing-for-mba-noise.md)
