---
'@munsonlabs/video-player': patch
---

Correct the web-component docs on where an import map is actually needed.

The `hls.js`/`dashjs` import map advice sat under "Supplying your own Vue", implying it was
needed for the esm.sh + `?external=vue` path. It isn't: `?external=vue` externalises only Vue,
and esm.sh still rewrites the bare `import('hls.js')`/`import('dashjs')` the native adapter
makes on demand. Loading from esm.sh needs no import map at all — only the
`__VUE_PROD_DEVTOOLS__` global.

Those entries *are* required when self-hosting `dist/` or loading raw file paths from
unpkg/jsdelivr, which serve the bundle with every bare specifier intact — and the failure is
deferred until an `.m3u8` or `.mpd` actually mounts, so it's easy to miss in testing. That case
is now its own section. Also stops one example handing out Vue's larger dev build.
