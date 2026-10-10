# Loom, step by step

[Loom](../../../packages/loom) as it was built, one chapter per commit. Each chapter says what that step added and why, lists the files to read, and runs a small live example of the new feature.

```bash
vp run --filter loom-steps-demo dev   # http://localhost:5214
```

Leave it running and `git checkout` any commit of the history: the page follows, adding or dropping chapters. The newest chapter opens by default, and the one you pick stays in the URL (`#step-3`).

```
src/
  App.vue          the page: chapters in the sidebar, the one picked in the main pane
  ChapterPage.vue  the layout each chapter shares: what's new, files to read, try it
  kit.js           the demo's own little kit (articles), which grows as loom does
  bolt.js          the stub native app and the connected Bolt bridge, for the chapters that use them
  chapters/        one file per step: 01-widgets-as-data.vue, …
```

Loom runs from source through the aliases in `vite.config.js`, so what you see is always the checked-out code.
