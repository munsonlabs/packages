import articleCard from './article-card.json'
import eventCard from './event-card.json'
import galleryCard from './gallery-card.json'
import liveBlog from './live-blog.json'
import podcastRow from './podcast-row.json'
import pullQuote from './pull-quote.json'
import videoTile from './video-tile.json'

/**
 * The example widgets, one JSON file each: what an editor edits and what a library bundles.
 * In library order, so the first whose conditions a story meets renders it: Bolt picks by `entry.type`, and so do these.
 */
export const widgets = [articleCard, eventCard, videoTile, galleryCard, podcastRow, liveBlog, pullQuote]
