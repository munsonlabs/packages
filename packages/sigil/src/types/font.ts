export interface FontLibraryOptions {
  className: string
  mapping?: Record<string, string> | ((name: string, variant?: string) => string | undefined)
  glyphs?: Record<string, string> | ((name: string, variant?: string) => string | undefined)
}
