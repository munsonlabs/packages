export type ResolvedSvg = string | { default: string }

export type SvgMap = Record<string, string | Record<string, string>>

export interface SvgLibraryOptions {
  resolver?: (name: string, variant?: string) => ResolvedSvg | Promise<ResolvedSvg>
  icons?: SvgMap | Promise<SvgMap>
  mutator?: (svg: SVGSVGElement) => void
}
