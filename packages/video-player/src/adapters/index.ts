import type { PlaybackAdapter, ResolvedSource, Matcher, EmbedAdapterFactory, SourceResolver, PlatformConfig } from '@/types/playback'
import type { EmbedAdapterOptions } from '@/types/playback'
import { HLS_MIME_TYPE, DASH_MIME_TYPE, MP4_MIME_TYPE } from '@/constants'

const matchers: Matcher[] = []

/**
 * Consumer registrations go in front of the built-ins, which register when this module loads. Pushed
 * onto the end instead, a matcher for a URL a built-in already claims could never win, so overriding
 * YouTube or Brightcove - the whole point of registering a platform by hand - quietly did nothing.
 * Built-ins seed the list in their own declaration order via `appendMatcher`.
 */
export function registerMatcher(matcher: Matcher): void {
  matchers.unshift(matcher)
}

function appendMatcher(matcher: Matcher): void {
  matchers.push(matcher)
}

export function resolvePlatform(url: string): { key: string; embed: boolean } {
  if (!url) return { key: 'html5', embed: false }
  const matched = matchers.find((m) => m.test(url))
  return { key: matched?.key ?? 'html5', embed: matched?.embed ?? false }
}

const embedAdapters: Record<string, EmbedAdapterFactory | undefined> = {}
const embedAdapterLoaders: Record<string, (() => Promise<EmbedAdapterFactory>) | undefined> = {}

export function registerEmbedAdapter(key: string, factory: EmbedAdapterFactory): void {
  embedAdapters[key] = factory
}

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

export function registerSourceResolver(key: string, resolver: SourceResolver): void {
  sourceResolvers[key] = resolver
}

function inferType(url: string): string | undefined {
  if (/\.m3u8(\?|#|$)/.test(url)) return HLS_MIME_TYPE
  if (/\.mpd(\?|#|$)/.test(url)) return DASH_MIME_TYPE
  if (/\.mp4(\?|#|$)/.test(url)) return MP4_MIME_TYPE
  return undefined
}

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

export function registerPlatform(config: PlatformConfig): void {
  registerMatcher({ test: config.test, key: config.key, embed: config.embed })
  if (config.embed) registerEmbedAdapter(config.key, config.createAdapter)
  else if (config.resolveSource) registerSourceResolver(config.key, config.resolveSource)
}

type LazyPlatformConfig = Pick<Matcher, 'key' | 'test'> &
  ({ embed: true; loadAdapter: () => Promise<EmbedAdapterFactory> } | { embed: false; loadResolver: () => Promise<SourceResolver> })

function registerLazyPlatform(config: LazyPlatformConfig): void {
  appendMatcher({ key: config.key, test: config.test, embed: config.embed })
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
