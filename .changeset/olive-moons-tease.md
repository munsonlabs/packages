---
'@munsonlabs/video-player': patch
---

Declare the side-effectful entry points instead of `sideEffects: false`.

`dist/elements/**` registers custom elements as a side effect, and CSS
imports are side effects by definition. Claiming the whole package is
side-effect-free let a bundler tree-shake either away, so an app importing
`@munsonlabs/video-player/element` could end up with the elements never
registered, or with the styles missing, depending on its bundler settings.
