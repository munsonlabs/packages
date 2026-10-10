import { darkTheme, defineTheme } from '@munsonlabs/loom'

/**
 * Bolt's look, read from the timeline's own theme variables when the page has them, so a
 * publisher's theme reaches loom widgets the way it reaches Bolt's (`--timeline-style-*`).
 */
export const timelineTheme = defineTheme({
  id: 'timeline',
  label: 'Timeline',
  dark: 'timeline-dark',
  values: {
    bg: 'var(--timeline-style-card-background, #ffffff)',
    text: 'var(--timeline-style-text, #18181b)',
    accent: 'var(--timeline-style-accent, #c2410c)',
    font: 'var(--timeline-style-font, system-ui, sans-serif)',
  },
})

export const timelineDarkTheme = defineTheme({
  id: 'timeline-dark',
  label: 'Timeline dark',
  values: {
    ...darkTheme.values,
    bg: 'var(--timeline-style-card-background-dark, #1c1c1f)',
    accent: 'var(--timeline-style-accent-dark, #fb923c)',
  },
})
