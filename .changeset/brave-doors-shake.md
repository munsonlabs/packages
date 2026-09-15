---
'@munsonlabs/video-player': patch
---

Stop the player changing width when a lazy `VideoCard` is clicked, and make the width cap themeable via `--mlv-max-width`.

`VideoCard` renders `VideoPlaceholder` and `VideoPlayer` as siblings, and only the player carried
`max-width: 800px; margin: 0 auto`. In any container wider than that, clicking the placeholder
swapped a full-width box for an 800px centred one, so the player visibly shrank and re-centred at
the moment playback started.

The cap is now `var(--mlv-max-width, 800px)` on `VideoPlaceholder`, `VideoPlayer` and
`VideoStage`'s wrapper alike — the same 800px by default, so nothing changes for existing
consumers, but the three agree and the value can be overridden like every other `--mlv-*`:

```css
.hero {
  --mlv-max-width: none;
}
```

Corner-pinned and pip sizes are deliberately unaffected: a mini-player is not subject to the
content width cap.
