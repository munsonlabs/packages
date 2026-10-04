export const SEAL_GLYPHS = {
  labs: [{ kind: 'line', d: 'M26.9 3.5L28.65 6.6H25.15Z' }],
  'video-player': [{ kind: 'solid', d: 'M25.7 3.4Q25.45 3.3 25.45 3.6V6.6Q25.45 6.9 25.7 6.8L28.35 5.3Q28.6 5.1 28.35 4.9Z' }],
  sigil: [
    { kind: 'solid', d: 'M25.95 3.15A1 1 0 1 0 25.95 5.15A1 1 0 1 0 25.95 3.15Z' },
    { kind: 'solid', d: 'M26.95 5.15H28.85V7.05H26.95Z' },
  ],
  shipkit: [
    { kind: 'line', d: 'M25.2 3.9L26.4 5.1L25.2 6.3' },
    { kind: 'line', d: 'M27.1 6.4H28.6' },
  ],
  blueprint: [
    { kind: 'line', d: 'M26.2 5.7H25V3.5H27.6V4.6', width: 0.65 },
    { kind: 'line', d: 'M26.2 4.6H28.8V6.7H26.2Z', width: 0.65 },
  ],
  reel: [
    { kind: 'solid', d: 'M25.15 4.95H28.75V7.05H25.15Z' },
    { kind: 'line', d: 'M25.3 4.05L28.45 3.15' },
  ],
  dye: [{ kind: 'solid', d: 'M26.9 3.1C26.4 3.9 25.6 4.8 25.6 5.7A1.3 1.3 0 0 0 28.2 5.7C28.2 4.8 27.4 3.9 26.9 3.1Z' }],
} as const satisfies Record<string, readonly { kind: 'line' | 'solid'; d: string; width?: number }[]>

export type SealGlyph = keyof typeof SEAL_GLYPHS
