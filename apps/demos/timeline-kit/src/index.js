import { createKit } from '@munsonlabs/loom'
import { iconBlock } from '@munsonlabs/loom/icon'
import { videoBlock } from '@munsonlabs/loom/video'
import { timelineKinds } from './kinds'
import { paywallGuard } from './paywall'
import { timelineSources } from './sources'
import { timelineDarkTheme, timelineTheme } from './themes'

/**
 * Bolt's timeline as a loom kit: stories are the data, the Bolt bridge is the context, and
 * Bolt-style composables are the sources. Loom itself knows none of this.
 */
export const timelineKit = createKit({
  id: 'timeline',
  themes: [timelineTheme, timelineDarkTheme],
  sources: timelineSources,
  blocks: [videoBlock, iconBlock],
  kinds: timelineKinds,
  describe: (story) => story.entry.title ?? story.entry.id,
  // Locked stories show the native paywall, whatever the widget.
  guard: paywallGuard,
})

export { widgets } from './widgets'
export { registerIcons } from './icons'
export { stories, feedOf } from './feed'
export { timelineKinds } from './kinds'
export { paywallGuard } from './paywall'
export { timelineSources } from './sources'
export * from './sources'
export { timelineTheme, timelineDarkTheme } from './themes'
