import type { PlaybackAdapter, ResolvedSource, Matcher, EmbedAdapterFactory, SourceResolver, PlatformConfig } from '@/types/playback'
import type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'
import { HLS_MIME_TYPE, DASH_MIME_TYPE, MP4_MIME_TYPE } from '@/constants'

const matchers: Matcher[] = []

/**
 * Registers a URL-detection rule: `test(url)` reports a match, `key` is the platform's identifier,
 * `embed` says whether it's an embed-type platform (its own SDK/iframe) or a source-type one
 * (resolves to a plain playable file). Checked in registration order after the five built-ins, so
 * a custom matcher can't shadow a built-in platform's URLs.
 */
export function registerMatcher(matcher: Matcher): void {
  matchers.push(matcher)
}

/**
 * Returns the matched platform's key for a URL (e.g. `'youtube'`), or `'html5'` if nothing matches.
 */
export function getPlatform(url: string): string {
  if (!url) return 'html5'
  return matchers.find((m) => m.test(url))?.key ?? 'html5'
}

/**
 * Like `getPlatform`, but also reports whether the match is embed-type - one matcher lookup instead of two.
 */
export function resolvePlatform(url: string): { key: string; embed: boolean } {
  if (!url) return { key: 'html5', embed: false }
  const matched = matchers.find((m) => m.test(url))
  return { key: matched?.key ?? 'html5', embed: matched?.embed ?? false }
}

const embedAdapters: Record<string, EmbedAdapterFactory | undefined> = {}
const embedAdapterLoaders: Record<string, (() => Promise<EmbedAdapterFactory>) | undefined> = {}

/**
 * Registers the factory that builds a `PlaybackAdapter` for an embed-type platform's `key` -
 * usePlayer.ts calls this (via `createEmbedAdapter`) instead of `createNativeAdapter` whenever
 * `resolvePlatform` reports `embed: true`.
 */
export function registerEmbedAdapter(key: string, factory: EmbedAdapterFactory): void {
  embedAdapters[key] = factory
}

/**
 * Builds the embed adapter for `key`: an already-registered factory if one exists, otherwise awaits
 * and caches whichever lazy loader `registerLazyPlatform` registered for a built-in platform.
 * Resolves to `null` if `key` has neither.
 */
export async function createEmbedAdapter(key: string, videoEl: HTMLVideoElement, options: EmbedAdapterOptions): Promise<PlaybackAdapter | null> {
  let factory = embedAdapters[key]
  if (!factory) {
    const load = embedAdapterLoaders[key]
    if (!load) return null
    factory = await load()
    embedAdapters[key] = factory
  }
  return factory(videoEl, options)
}

const sourceResolvers: Record<string, SourceResolver | undefined> = {}
const sourceResolverLoaders: Record<string, (() => Promise<SourceResolver>) | undefined> = {}

/**
 * Registers how a source-type platform's `key` resolves to a playable
 * `{ src, type?, poster?, adTagUrl? }` - skip this for a platform whose URLs are already a direct
 * MP4/HLS/DASH link (jwplayer/brightcove need it; a plain URL doesn't).
 */
export function registerSourceResolver(key: string, resolver: SourceResolver): void {
  sourceResolvers[key] = resolver
}

/**
 * resolveSource's last resort when no resolver applies: guesses a MIME type from the URL's file extension.
 */
function inferType(url: string): string | undefined {
  if (/\.m3u8(\?|#|$)/.test(url)) return HLS_MIME_TYPE
  if (/\.mpd(\?|#|$)/.test(url)) return DASH_MIME_TYPE
  if (/\.mp4(\?|#|$)/.test(url)) return MP4_MIME_TYPE
  return undefined
}

/**
 * Resolves `key`'s source: an already-registered resolver if one exists, otherwise awaits and
 * caches whichever lazy loader `registerLazyPlatform` registered for a built-in platform, otherwise
 * passes `url` through unresolved with its type guessed from the extension.
 */
export async function resolveSource(key: string, url: string): Promise<ResolvedSource> {
  let resolver = sourceResolvers[key]
  if (!resolver) {
    const load = sourceResolverLoaders[key]
    if (load) {
      resolver = await load()
      sourceResolvers[key] = resolver
    }
  }
  if (resolver) return resolver(url)
  return { src: url, type: inferType(url) }
}

/** The one call most consumers need: registers `config`'s matcher plus whichever of `createAdapter`/`resolveSource` applies, in one go. */
export function registerPlatform(config: PlatformConfig): void {
  registerMatcher({ test: config.test, key: config.key, embed: config.embed })
  if (config.embed) registerEmbedAdapter(config.key, config.createAdapter)
  else if (config.resolveSource) registerSourceResolver(config.key, config.resolveSource)
}

/** `registerLazyPlatform`'s config - `registerPlatform`'s shape, but a loader in place of an already-in-hand factory/resolver. */
type LazyPlatformConfig = Pick<Matcher, 'key' | 'test'> &
  ({ embed: true; loadAdapter: () => Promise<EmbedAdapterFactory> } | { embed: false; loadResolver: () => Promise<SourceResolver> })

/**
 * `registerPlatform`'s counterpart for the five built-ins that need real adapter code (html5 is the
 * implicit, unregistered fallback - resolveSource/createNativeAdapter handle it directly): registers
 * the matcher eagerly (cheap, needed synchronously for detection) plus a loader for the platform's
 * own adapter code, resolved via dynamic import and cached on first use - a consumer who never plays
 * a given platform's URLs never downloads its code. Not part of the public registry API: a
 * consumer's own `registerPlatform` call already has its factory in hand, so there's nothing to defer.
 */
function registerLazyPlatform(config: LazyPlatformConfig): void {
  registerMatcher({ key: config.key, test: config.test, embed: config.embed })
  if (config.embed) embedAdapterLoaders[config.key] = config.loadAdapter
  else sourceResolverLoaders[config.key] = config.loadResolver
}

registerLazyPlatform({
  key: 'youtube',
  test: (src) => /youtu\.be|youtube\.com/.test(src),
  embed: true,
  loadAdapter: () => import('@/adapters/embeds/youtube').then((m) => m.createYoutubeAdapter),
})

registerLazyPlatform({
  key: 'vimeo',
  test: (src) => /vimeo\.com|player\.vimeo\.com/.test(src),
  embed: true,
  loadAdapter: () => import('@/adapters/embeds/vimeo').then((m) => m.createVimeoAdapter),
})

registerLazyPlatform({
  key: 'dailymotion',
  test: (src) => /dailymotion\.com|dai\.ly/.test(src),
  embed: true,
  loadAdapter: () => import('@/adapters/embeds/dailymotion').then((m) => m.createDailymotionAdapter),
})

registerLazyPlatform({
  key: 'jwplayer',
  test: (src) => /cdn\.jwplayer\.com/.test(src) || src.startsWith('jwplayer://'),
  embed: false,
  loadResolver: () => import('@/adapters/sources/jwplayer').then((m) => m.resolveSource),
})

registerLazyPlatform({
  key: 'brightcove',
  test: (src) => /players\.brightcove\.net/.test(src),
  embed: false,
  loadResolver: () => import('@/adapters/sources/brightcove').then((m) => m.resolveSource),
})
