import { ref, shallowRef } from 'vue'
import { loadLibrary } from '@munsonlabs/loom'
import { timelineKit as kit } from 'timeline-kit'

/** The library this app ships with, as an app would fetch it from its CMS. */
export const BUNDLED_FILE = 'timeline.library.json'
const STORAGE_KEY = 'loom-feed-demo:library'

/**
 * @typedef {object} LibrarySource
 * @property {string} name
 * @property {boolean} imported
 */

/**
 * The library the feed renders: the bundled file, or one imported from the studio, which this
 * browser remembers until you go back to the bundled one. Loading goes through `loadLibrary`,
 * so widgets this app can't render are skipped and reported, never thrown.
 */
export function useLibrary() {
  const library = shallowRef()
  const source = ref()
  const error = ref()

  function use(text, name, imported) {
    try {
      library.value = loadLibrary(kit, text)
      source.value = { name, imported }
      error.value = undefined
      return true
    } catch (e) {
      error.value = `${name}: ${e instanceof Error ? e.message : String(e)}`
      return false
    }
  }

  function remember(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Not remembering is fine.
    }
  }

  async function loadBundled() {
    const response = await fetch(`${import.meta.env.BASE_URL}${BUNDLED_FILE}`)
    if (use(await response.text(), BUNDLED_FILE, false)) remember(undefined)
  }

  /** Reads a library from a file (picked or dropped) or pasted text. */
  async function importLibrary(input, name = 'Pasted library') {
    const text = typeof input === 'string' ? input : await input.text()
    const label = typeof input === 'string' ? name : input.name
    const ok = use(text, label, true)
    if (ok) remember({ text, name: label })
    return ok
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (saved && use(saved.text, saved.name, true)) return
    } catch {
      // Unreadable: fall back to the bundled library.
    }
    void loadBundled()
  }

  restore()
  return { library, source, error, importLibrary, loadBundled }
}
