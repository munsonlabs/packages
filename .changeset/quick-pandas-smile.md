---
'@munsonlabs/shipkit': patch
---

Fix `inlineCss` corrupting its own state across concurrent builds.

A package that declares several pack configs shares one plugin instance
between them (each spreads the same base config), and those builds run
concurrently. The plugin stashed the output directory and chunk list in
`generateBundle` for `closeBundle` to read, so one build could overwrite
them while another was still mid-flight — failing with `"style.css" ... does
not exist`, or silently inlining against the wrong build's output. It now
uses `writeBundle`, which is handed each build's own options and bundle.
