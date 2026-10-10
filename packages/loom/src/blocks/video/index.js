import Video, { spec } from './Video.vue'

/**
 * A `Video` block for kits that render video. Its own entry, so only apps that use it pull in
 * the player; import `@munsonlabs/video-player/style` alongside.
 *
 * ```js
 * createKit({ blocks: [videoBlock], ... })
 * ```
 */
export const videoBlock = { ...spec, component: Video }
