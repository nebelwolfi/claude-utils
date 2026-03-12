---
created: 2026-03-03T19:55:47.963Z
updated: 2026-03-05T00:38:35.786Z
started: 2026-03-05T00:28:40.914Z
completed: 2026-03-05T00:37:54.498Z
priority: low
tags:
  - mba
  - gui
  - config
---

# MBA: GUI noise slider

Add MBA noise density slider to the obfuscation config GUI.

**`include/PEcker/gui/obfuscation_config_view.h`:**
- Add `float mba_noise = 0.0f;` to `PassSettings` (~line 122)
- Add clamping in `clamp()`: `if (mba_noise < 0.0f) mba_noise = 0.0f; if (mba_noise > 1.0f) mba_noise = 1.0f;`
- Update `computeOverhead`: factor in noise (`+ mba_noise * 5.0f`)
- Update presets (aggressive: `mba_noise = 0.8f`, default: `mba_noise = 0.0f`)

**`include/PEcker/gui/obfuscation_config_panel.h`:**
- Add `mba_noise` to PassType::MBA case in `applyToConfig`
- Add serialization/deserialization (`appendFloat`/`mjson_get_number`)
- Update impact estimate: `size_pct += mba_noise * 5.0f`

**`src/gui/views/obfuscation_config.cpp`:**
- Add `element_t* mba_noise_slider = nullptr;` and `element_t* mba_noise_val = nullptr;`
- Create slider row: `"MBA Noise"`, range 0.0-1.0, step 0.05
- Read slider value on drag, write to `pass.mba_noise`
- Set slider value from config in load path

**Files:** `obfuscation_config_view.h`, `obfuscation_config_panel.h`, `obfuscation_config.cpp`

## Sub-tasks

- [x] Add mba_noise to PassSettings + clamp + presets in config_view.h
- [x] Add mba_noise serialize/deserialize in config_panel.h
- [x] Add MBA noise slider UI in obfuscation_config.cpp

## Relations

- [requires mba-config-plumbing-for-mba-noise](mba-config-plumbing-for-mba-noise.md)
