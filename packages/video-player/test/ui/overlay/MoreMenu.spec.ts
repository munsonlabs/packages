import { describe, it, expect, vi } from 'vite-plus/test'
import { reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import MoreMenu from '@/ui/overlay/MoreMenu.vue'
import { PlayerKey, HudKey, ActionKey, PlaylistKey, NO_PLAYLIST } from '@/ui/player/playerContext'
import type { PlayerContext, HudContext } from '@/ui/player/playerContext'

const TRACKS = [
  { index: 0, label: 'English', language: 'en' },
  { index: 1, label: 'French', language: 'fr' },
]

const LEVELS = [
  { index: 0, height: 360, bitrate: 800_000, label: '360p' },
  { index: 1, height: 720, bitrate: 2_000_000, label: '720p' },
]

function makePlayer(overrides: Record<string, unknown> = {}) {
  return reactive({
    isLooping: false,
    isAudible: true,
    isPipActive: false,
    supportsPip: false,
    supportsPlaybackRate: true,
    currentPlaybackRate: 1,
    supportsCaptions: true,
    captionTracks: TRACKS,
    activeCaptionIndex: null,
    supportsQuality: true,
    qualityLevels: LEVELS,
    currentQualityHeight: null,
    isAutoQuality: true,
    toggleLoop: vi.fn(),
    toggleMute: vi.fn(),
    togglePip: vi.fn(),
    setPlaybackRate: vi.fn(),
    setCaptionTrack: vi.fn(),
    setQuality: vi.fn(),
    ...overrides,
  }) as unknown as PlayerContext
}

function mountMenu(player = makePlayer()) {
  const hud = reactive({ keepOpen: vi.fn() }) as unknown as HudContext
  const wrapper = mount(MoreMenu, {
    props: { compact: false },
    global: {
      provide: {
        [PlayerKey as symbol]: player,
        [HudKey as symbol]: hud,
        [PlaylistKey as symbol]: NO_PLAYLIST,
        [ActionKey as symbol]: ref(null),
      },
    },
  })
  return { wrapper, player }
}

function row(wrapper: ReturnType<typeof mountMenu>['wrapper'], label: string) {
  const found = wrapper.findAll('button').find((b) => b.text().includes(label))
  if (!found) throw new Error(`no row labelled ${label}`)
  return found
}

/**
 * These rows hand the player to a plain function rather than calling a bound closure, which a
 * template cannot typecheck: a handler written without its argument silently receives the click
 * event instead, and the row goes dead. Each case clicks the real row and reads the call.
 */
describe('MoreMenu rows drive the player', () => {
  it('cycles captions from off to the first track', async () => {
    const { wrapper, player } = mountMenu()

    await row(wrapper, 'Captions').trigger('click')

    expect(player.setCaptionTrack).toHaveBeenCalledWith(0)
  })

  it('cycles captions off again once past the last track', async () => {
    const { wrapper, player } = mountMenu(makePlayer({ activeCaptionIndex: 1 }))

    await row(wrapper, 'Captions').trigger('click')

    expect(player.setCaptionTrack).toHaveBeenCalledWith(null)
  })

  it('steps quality from Auto down to the highest level', async () => {
    const { wrapper, player } = mountMenu()

    await row(wrapper, 'Quality').trigger('click')

    expect(player.setQuality).toHaveBeenCalledWith(720)
  })

  it('steps quality back to Auto from the lowest level', async () => {
    const { wrapper, player } = mountMenu(makePlayer({ isAutoQuality: false, currentQualityHeight: 360 }))

    await row(wrapper, 'Quality').trigger('click')

    expect(player.setQuality).toHaveBeenCalledWith(null)
  })

  it('cycles the playback speed', async () => {
    const { wrapper, player } = mountMenu()

    await row(wrapper, 'Playback speed').trigger('click')

    expect(player.setPlaybackRate).toHaveBeenCalledTimes(1)
    expect(player.setPlaybackRate).not.toHaveBeenCalledWith(1)
  })

  it('shows the active track and level rather than a placeholder', () => {
    const { wrapper } = mountMenu(makePlayer({ activeCaptionIndex: 1, isAutoQuality: false, currentQualityHeight: 720 }))

    expect(row(wrapper, 'Captions').text()).toContain('French')
    expect(row(wrapper, 'Quality').text()).toContain('720p')
  })
})
