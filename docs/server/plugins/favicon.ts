// Docus hardcodes `<link rel="icon" href="/favicon.ico">` in its own app.vue with no
// dedupe key, so it can't be overridden from nuxt.config — and that path both misses
// the Pages base path and points at a file this repo doesn't have. Strip it here; the
// base-aware favicon.svg link from nuxt.config's app.head is the one we want.
//
// Note: each `html.head` entry is a concatenated chunk of many tags, not a single tag,
// so this rewrites within each chunk rather than filtering the array.
const FAVICON_ICO = /<link\b[^>]*href="\/favicon\.ico"[^>]*>/g

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    html.head = html.head.map((chunk) => chunk.replace(FAVICON_ICO, ''))
  })
})
