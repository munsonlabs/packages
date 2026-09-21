import { cached } from './cached'
import type { IconSource, ResolvedIcon, ResolvedSvg, SvgLibraryOptions, SvgMap } from '../types/index'

const URL_PATTERN = /^(?:https?:\/\/|\/|\.\/)/
const SVG_ROOT = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i

type Resolver = NonNullable<SvgLibraryOptions['resolver']>

/**
 * Normalises whatever a resolver returned into SVG markup: markup itself, a URL to fetch, or a
 * module namespace with a `default` string.
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
 * Parses markup as an SVG document and insists that the root really is `<svg>`.
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
 * either a single value (markup or URL) or a map of variants with a `default`.
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
 * The renderable form of SVG markup: a `<span class="icon-svg">` wrapping it.
 */
function toIcon(svg: string): ResolvedIcon {
  return {
    tag: 'span',
    className: 'icon-svg',
    html: svg,
  }
}

/**
 * A library of SVG icons resolved by name. Configured with a `resolver` function or an `icons`
 * map, plus an optional `mutator` that runs once on the parsed `<svg>` before it's cached.
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
