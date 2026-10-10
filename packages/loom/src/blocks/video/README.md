# `blocks/video/`: the optional Video block

`videoBlock`, published as `@munsonlabs/loom/video`, plays MP4, HLS, DASH, YouTube, Vimeo, Dailymotion, Brightcove and JW Player through `@munsonlabs/video-player`. It shows its poster until it's played or scrolled into view.

It's its own entry point so only apps that render video pull in the player. An app opts in with `createKit({ blocks: [videoBlock] })` and imports `@munsonlabs/video-player/style`.

## Technically

`Video.vue` (`LoomVideo`) is an SFC wrapping the player's `VideoCard`. Its spec and CSS sit in the same file, as a built-in's do, and `index.js` pairs the spec with the component as a kit's own block, which makes it the example to copy when adding a block outside loom.
