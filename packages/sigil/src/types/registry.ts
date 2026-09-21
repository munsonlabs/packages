import type { FontLibraryOptions } from './font'
import type { SvgLibraryOptions } from './svg'

export interface IconQuery {
  library?: string
  variant?: string
}

export interface IconRequest {
  name: string
  variant?: string
}

export interface ResolvedIcon {
  tag: string
  className?: string
  html?: string
  text?: string
}

export interface IconSource {
  resolveSync?(request: IconRequest): ResolvedIcon | undefined
  resolve?(request: IconRequest): Promise<ResolvedIcon | undefined>
  dispose?(): void
}

export interface OverrideRequest extends IconRequest {
  library?: string
}

export type IconOverride = string | ((request: OverrideRequest) => string)

export interface OverrideOptions {
  library?: string
}

export type LibraryConfig = IconSource | SvgLibraryOptions | FontLibraryOptions
