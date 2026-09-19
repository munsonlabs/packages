import type { FontLibraryOptions, IconSource } from '../types/index'

const HEX = /^[0-9a-f]{4,6}$/i

type Table<T> = Record<string, T> | ((name: string, variant?: string) => T | undefined)

/**
 * The text content for a glyph value. A four-to-six digit hex string is a codepoint (`e001` is how
 * icon fonts usually document their glyphs); anything else - a character, a ligature word - is used as
 * it is.
 */
function toGlyph(value: string): string {
  if (HEX.test(value)) {
    return String.fromCodePoint(parseInt(value, 16))
  }
  return value
}

/**
 * Reads a name from a `mapping` or `glyphs` table, which may be a record or a function. Only the
 * function form is told the variant; a record has no way to vary by it. `undefined` from either means
 * the table has nothing for this name.
 */
function lookup<T>(table: Table<T>, name: string, variant?: string): T | undefined {
  if (typeof table === 'function') {
    return table(name, variant)
  }
  return table[name]
}

/**
 * A CSS icon font: the registry produces an `<i>` carrying the font's base class plus, depending on the
 * config, a per-icon modifier class (`mapping`) and/or a glyph as text content (`glyphs`). Loading the
 * font's own `@font-face` and base rule is the page's job.
 *
 * Everything here is synchronous, so a font icon paints in the same frame it is asked for. A name that
 * a record `mapping` or `glyphs` does not contain, or that a function form answers `undefined` for, is
 * not this library's: the source declines rather than emitting an `<i>` that shows nothing, so the
 * registry can render nothing instead. With no `mapping` at all the name itself is the modifier class,
 * which suits fonts whose class names are the icon names. With only `glyphs` configured, no modifier
 * class is emitted - the glyph is the icon.
 */
export function fontLibrary({ className, mapping, glyphs }: FontLibraryOptions): IconSource {
  return {
    resolveSync({ name, variant }) {
      let modifier: string | undefined
      if (mapping !== undefined) {
        modifier = lookup(mapping, name, variant)
        if (modifier === undefined) {
          return undefined
        }
      } else if (glyphs === undefined) {
        modifier = name
      }

      let text: string | undefined
      if (glyphs !== undefined) {
        const glyph = lookup(glyphs, name, variant)
        if (glyph === undefined) {
          return undefined
        }
        text = toGlyph(glyph)
      }

      return {
        tag: 'i',
        className: modifier === undefined ? className : `${className} ${modifier}`,
        text,
      }
    },
  }
}
