import { pickBestSource, createCachedResolver } from '@/adapters/sourceHelpers'
import type { ResolvedSource } from '@/types/playback'

export const BRIGHTCOVE_PLAYBACK_API = 'https://edge.api.brightcove.com/playback/v1/accounts'

export const BRIGHTCOVE_PLAYER_CONFIG = 'https://players.brightcove.net'

interface ParsedBrightcoveSrc {
  accountId: string
  playerId: string
  embed: string
  videoId: string
}

function parseSrc(src: string): ParsedBrightcoveSrc | null {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return null
  }
  if (url.hostname !== 'players.brightcove.net') return null

  const [, accountId, playerEmbed] = url.pathname.split('/')
  const videoId = url.searchParams.get('videoId')
  const underscoreIndex = playerEmbed?.indexOf('_') ?? -1
  if (!accountId || underscoreIndex === -1 || !videoId) return null

  return {
    accountId,
    playerId: playerEmbed.slice(0, underscoreIndex),
    embed: playerEmbed.slice(underscoreIndex + 1),
    videoId,
  }
}

// Not every account names its ad plugin `ima3` - check all plugins for a `serverUrl` rather than assuming one name.
function extractAdTagUrl(config: {
  plugins?: Array<{ name: string; options?: { serverUrl?: string; imaOptions?: { serverUrl?: string } } }>
}): string | null {
  for (const plugin of config?.plugins ?? []) {
    const serverUrl = plugin.options?.serverUrl ?? plugin.options?.imaOptions?.serverUrl
    if (serverUrl) return serverUrl
  }
  return null
}

const fetchPlayerConfig = createCachedResolver<
  [accountId: string, playerId: string, embed: string, overrideKey?: string],
  { policyKey: string; adTagUrl: string | null }
>(
  async (accountId, playerId, embed, overrideKey) => {
    const res = await fetch(`${BRIGHTCOVE_PLAYER_CONFIG}/${accountId}/${playerId}_${embed}/config.json`)
    if (!res.ok) throw new Error(`Brightcove: could not load player config (${res.status})`)

    const config = await res.json()
    const policyKey = overrideKey ?? config?.video_cloud?.policy_key
    if (!policyKey) throw new Error('Brightcove: policy_key not found in player config')

    return { policyKey, adTagUrl: extractAdTagUrl(config) }
  },
  (accountId, playerId, embed) => `${accountId}/${playerId}_${embed}`,
)

async function fetchSources(
  accountId: string,
  videoId: string,
  policyKey: string,
): Promise<{ sources: Array<{ src: string; type: string }>; poster: string | null }> {
  const res = await fetch(`${BRIGHTCOVE_PLAYBACK_API}/${accountId}/videos/${videoId}`, {
    headers: { Accept: `application/json;pk=${policyKey}` },
  })
  if (!res.ok) throw new Error(`Brightcove Playback API error: ${res.status}`)

  const data = await res.json()
  const sources = pickBestSource(data.sources || [])

  if (!sources.length) throw new Error('Brightcove: no playable sources found')

  return {
    sources: sources.map((s) => ({ src: s.src, type: s.type })),
    poster: data.poster ?? data.thumbnail ?? null,
  }
}

export async function resolveSource(src: string, overrideKey?: string): Promise<ResolvedSource> {
  const parsed = parseSrc(src)
  if (!parsed) {
    throw new Error(
      'Brightcove: invalid src — expected a Brightcove embed URL, e.g. "https://players.brightcove.net/{accountId}/{playerId}_{embed}/index.html?videoId={videoId}"',
    )
  }

  const { accountId, playerId, embed, videoId } = parsed
  const { policyKey, adTagUrl } = await fetchPlayerConfig(accountId, playerId, embed, overrideKey)
  const { sources, poster } = await fetchSources(accountId, videoId, policyKey)

  return { ...sources[0], poster, adTagUrl }
}
