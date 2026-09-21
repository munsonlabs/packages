import type { FontLibraryOptions, IconSource } from '../types/index'

const HEX = /^[0-9a-f]{4,6}$/i

type Table<T> = Record<string, T> | ((name: string, variant?: string) => T | undefined)

/**
 * The text content for a glyph value: a hex codepoint becomes the character it names, anything
 * else is used as is.
 */
function toGlyph(value: string): string {
  if (HEX.test(value)) {
    return String.fromCodePoint(parseInt(value, 16))
  }
  return value
}

/**
 * Reads a name from a `mapping` or `glyphs` table, which may be a record or a function.
 */
function lookup<T>(table: Table<T>, name: string, variant?: string): T | undefined {
  if (typeof table === 'function') {
    return table(name, variant)
  }
  return table[name]
}

/**
 * A CSS icon font: the registry produces an `<i>` carrying the font's base class plus, depending
 * on the config, a per-icon modifier class (`mapping`) and/or a glyph as text content (`glyphs`).
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
