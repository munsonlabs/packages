---
'@munsonlabs/video-player': patch
---

- **Quality selection** works on multi-variant streams. Clicks no longer get swallowed mid-switch, and `qualityLevels` lists one rung per resolution (highest bitrate of each, ascending, audio-only renditions dropped) instead of every manifest variant. Indices are unchanged, so `setQuality` is unaffected.
- **Player width** no longer jumps when a lazily mounted player replaces its placeholder. Placeholder, player and stage all share the same cap, now `--mlv-max-width` (default `800px`). Override it like any other `--mlv-*` variable, e.g. `--mlv-max-width: none`. Corner-pinned and pip sizes are unaffected.
- **`sideEffects`** is now declared for `dist/elements/**` and CSS imports instead of the whole package being marked side-effect-free, so bundlers no longer tree-shake custom element registration or styles out of `@munsonlabs/video-player/element`.
