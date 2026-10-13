import { sourcesUsed } from './paths'
import { hasErrors, validateDefinition } from './validate'
import { validateKind, withKinds } from './kinds'

/**
 * A library is what an app fetches: every published widget for one kit, in one file, in
 * order (the first whose kind matches some data renders it), and any kinds made in an editor.
 * It also lists the sources and blocks its widgets need, so an app can tell before rendering
 * that it can't serve one.
 */

export const LIBRARY_FORMAT = 'loom-library'
export const LIBRARY_VERSION = 1

/**
 * @typedef {object} WidgetLibrary
 * @property {typeof LIBRARY_FORMAT} format
 * @property {typeof LIBRARY_VERSION} version
 * @property {string} [kit] The kit's id, when it has one.
 * @property {string} [publishedAt]
 * @property {string[]} sources Every source a widget binds to.
 * @property {string[]} blocks Every block a widget uses.
 * @property {KindSpec[]} [kinds] Kinds made in an editor, added to the kit's when it loads.
 * @property {WidgetDefinition[]} widgets
 */

export class LibraryError extends Error {
  name = 'LibraryError'
}

function blocksUsed(definition) {
  const types = new Set()
  const visit = (node) => {
    types.add(node.type)
    node.children?.forEach(visit)
  }
  visit(definition.root)
  return [...types]
}

const union = (lists) => [...new Set(lists.flat())].sort()

/**
 * Bundles definitions, in order, into a library for `kit`, with the kinds made for them.
 *
 * @param {Kit} kit
 * @param {WidgetDefinition[]} definitions
 * @param {{ publishedAt?: Date | string; kinds?: KindSpec[] }} [options={}]
 * @returns {WidgetLibrary}
 */
export function createLibrary(kit, definitions, options = {}) {
  const publishedAt = options.publishedAt instanceof Date ? options.publishedAt.toISOString() : options.publishedAt
  return {
    format: LIBRARY_FORMAT,
    version: LIBRARY_VERSION,
    ...(kit.id ? { kit: kit.id } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    sources: union(definitions.map(sourcesUsed)),
    blocks: union(definitions.map(blocksUsed)),
    ...(options.kinds?.length ? { kinds: options.kinds } : {}),
    widgets: definitions,
  }
}

/**
 * @typedef {object} LoadedLibrary
 * @property {Kit} kit This app's kit with the library's kinds added: render with it, since widgets may be for those kinds.
 * @property {WidgetDefinition[]} widgets The widgets this app can render, in order: pass them to `<Widget :definitions>`.
 * @property {KindSpec[]} kinds The library's kinds that loaded.
 * @property {Array<{ id: string; issues: ValidationIssue[] }>} skippedKinds Kinds left out, with why. Widgets of those kinds are skipped too.
 * @property {Array<{ id: string; name?: string; issues: ValidationIssue[] }>} skipped Widgets left out because they wouldn't render as written here, with why.
 * @property {{ sources: string[]; blocks: string[] }} missing What the library needs that this kit doesn't have: usually an app older than the library.
 * @property {{ expected: string; actual: string }} [kitMismatch] Set when the library names a different kit than this one.
 * @property {string} [publishedAt]
 */

/** A library entry that is at least shaped like a definition: anything else can't be validated. */
const isDefinition = (entry) => !!entry && typeof entry === 'object' && typeof entry.root === 'object' && entry.root !== null

/**
 * Reads a library (or a bare array of definitions) for this app's kit: adds the kinds it can, in
 * place of any the kit already had from an editor, validates each definition against the
 * result, and keeps only the ones that render as written. Widgets with only warnings are kept;
 * entries that aren't definitions at all are skipped like any other. Throws `LibraryError` for
 * something that isn't a library, or one from a newer version than this loom understands.
 *
 * @param {Kit} kit
 * @param {unknown} input
 * @returns {LoadedLibrary}
 */
export function loadLibrary(kit, input) {
  let data = input
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      throw new LibraryError('Not JSON')
    }
  }

  const library = Array.isArray(data) ? { widgets: data } : data
  if (!library || typeof library !== 'object' || !Array.isArray(library.widgets)) {
    throw new LibraryError('Not a widget library: expected { format: "loom-library", widgets: [...] }')
  }
  if ('format' in library && library.format !== LIBRARY_FORMAT) throw new LibraryError(`Unknown format "${String(library.format)}"`)
  if ('version' in library && Number(library.version) > LIBRARY_VERSION) {
    throw new LibraryError(`Library version ${String(library.version)} is newer than this loom understands (${LIBRARY_VERSION})`)
  }

  const kinds = []
  const skippedKinds = []
  // The library's kinds replace any made in an editor, so loading it into a kit that already has them works.
  let withLibraryKinds = { ...kit, kinds: kit.kinds.filter((k) => !k.crafted) }
  for (const [index, spec] of (Array.isArray(library.kinds) ? library.kinds : []).entries()) {
    const issues = validateKind(withLibraryKinds, spec)
    if (hasErrors(issues)) {
      skippedKinds.push({ id: typeof spec?.id === 'string' ? spec.id : `#${index + 1}`, issues: issues.filter((i) => i.severity !== 'warning') })
      continue
    }
    withLibraryKinds = withKinds(withLibraryKinds, [spec])
    kinds.push(spec)
  }

  const widgets = []
  const skipped = []
  const definitions = []
  library.widgets.forEach((entry, index) => {
    if (!isDefinition(entry)) {
      const { id, name } = entry ?? {}
      skipped.push({ id: typeof id === 'string' ? id : `#${index + 1}`, name, issues: [{ message: 'Not a widget definition: it needs a root' }] })
      return
    }
    definitions.push(entry)
    const issues = validateDefinition(withLibraryKinds, entry)
    if (hasErrors(issues)) skipped.push({ id: entry.id, name: entry.name, issues: issues.filter((i) => i.severity !== 'warning') })
    else widgets.push(entry)
  })

  // Worked out from the widgets themselves, so a hand-edited file can't misreport it.
  const missing = {
    sources: union(definitions.map(sourcesUsed)).filter((id) => !kit.sources[id]),
    blocks: union(definitions.map(blocksUsed)).filter((type) => !kit.blocks[type]),
  }

  return {
    kit: withLibraryKinds,
    widgets,
    kinds,
    skipped,
    skippedKinds,
    missing,
    ...(library.kit && kit.id && library.kit !== kit.id ? { kitMismatch: { expected: kit.id, actual: library.kit } } : {}),
    ...(library.publishedAt ? { publishedAt: library.publishedAt } : {}),
  }
}
