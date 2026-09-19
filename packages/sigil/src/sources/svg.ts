import { cached } from './cached'
import type { IconSource, ResolvedIcon, ResolvedSvg, SvgLibraryOptions, SvgMap } from '../types/index'

const URL_PATTERN = /^(?:https?:\/\/|\/|\.\/)/
const SVG_ROOT = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i

type Resolver = NonNullable<SvgLibraryOptions['resolver']>

/**
 * Normalises whatever a resolver returned into SVG markup. A resolver may hand back markup directly, a
 * URL to fetch it from, or a module namespace with a `default` string (so `import('./x.svg?raw')` can
 * be returned unwrapped). Anything else is a programming error. A URL that does not respond OK fails
 * the resolution rather than being treated as markup.
 */
async function toMarkup(value: ResolvedSvg): Promise<string> {
  const content = typeof value === 'object' && value !== null && 'default' in value ? value.default : value
  if (typeof content !== 'string') {
    throw new TypeError('SVG resolver must return markup, a URL, or a module with a default string export')
  }

  if (!URL_PATTERN.test(content)) {
    return content
  }

  const response = await fetch(content)
  if (!response.ok) {
    throw new Error(`Failed to fetch icon (${response.status}): ${content}`)
  }
  return response.text()
}

/**
 * Parses markup as an SVG document and insists that the root really is `<svg>`. This is what keeps an
 * HTML error page served with a 200 from being injected into the page as if it were an icon.
 */
function parseSvg(markup: string, name: string): SVGSVGElement {
  const root = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement
  if (root.nodeName !== 'svg') {
    throw new Error(`Icon "${name}" did not resolve to an <svg> document`)
  }
  return root as unknown as SVGSVGElement
}

/**
 * Makes a resolver out of a plain map of icons - the `{ icons }` form of the config. Each entry is
 * either a single value (markup or URL) or a map of variants with a `default`; an unknown variant falls
 * back to `default`, and a missing name or a variant map without a usable entry fails the resolution.
 * The map may be a promise, which is how a fetched JSON file is registered.
 */
function fromMap(icons: SvgMap | Promise<SvgMap>): Resolver {
  return async (name, variant = 'default') => {
    const entry = (await icons)[name]
    if (entry === undefined) {
      throw new Error(`Icon "${name}" is not in this library`)
    }
    if (typeof entry === 'string') {
      return entry
    }

    const value = entry[variant] ?? entry.default
    if (value === undefined) {
      throw new Error(`Icon "${name}" has no "${variant}" variant`)
    }
    return value
  }
}

/**
 * The renderable form of SVG markup: a `<span class="icon-svg">` wrapping it, which one stylesheet
 * rule can size. Overrides produce exactly the same shape.
 */
function toIcon(svg: string): ResolvedIcon {
  return {
    tag: 'span',
    className: 'icon-svg',
    html: svg,
  }
}

/**
 * A library of SVG icons resolved by name. Configured with either a `resolver` function or an `icons`
 * map (which becomes a resolver), plus an optional `mutator` that runs once on the parsed `<svg>`
 * before the result is cached - typically to strip fixed sizes or force `currentColor`.
 *
 * In a browser every result is parsed and validated, mutated, and then remembered per name and variant
 * through `cached()`, so an icon costs one fetch for the life of the library. Without a DOM (a server
 * render) there is no parser: markup is checked by its root tag only, left unmutated and not cached, so
 * nothing unvalidated ever sits in a process-wide registry - the client does the real work once it
 * hydrates.
 */
export function svgLibrary(options: SvgLibraryOptions): IconSource {
  const resolver = options.resolver ?? (options.icons ? fromMap(options.icons) : undefined)
  if (!resolver) {
    throw new Error('svgLibrary needs a resolver or an icons map')
  }
  const { mutator } = options

  if (typeof DOMParser === 'undefined') {
    return {
      async resolve({ name, variant }) {
        const markup = await toMarkup(await resolver(name, variant))
        if (!SVG_ROOT.test(markup)) {
          throw new Error(`Icon "${name}" did not resolve to an <svg> document`)
        }
        return toIcon(markup)
      },
    }
  }

  return cached({
    async resolve({ name, variant }) {
      const markup = await toMarkup(await resolver(name, variant))
      const svg = parseSvg(markup, name)
      if (!mutator) {
        return toIcon(markup)
      }
      mutator(svg)
      return toIcon(new XMLSerializer().serializeToString(svg))
    },
  })
}
