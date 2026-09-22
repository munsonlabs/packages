import { describe, it, expect, vi } from 'vite-plus/test'
import { reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import PlayerOverlay from '@/ui/overlay/PlayerOverlay.vue'
import { PlayerKey, HudKey, ActionKey, PlaylistKey, NO_PLAYLIST } from '@/ui/player/playerContext'
import type { PlayerContext, HudContext } from '@/ui/player/playerContext'

function makePlayer(isFullscreen: boolean) {
  return reactive({
    isReady: true,
    isError: false,
    isFullscreen,
    isPlaying: false,
    hasEnded: false,
    isMuted: false,
    isAudible: true,
    isLooping: false,
    isBuffering: false,
    isLive: false,
    currentTime: 0,
    duration: 120,
    currentVolume: 1,
    bufferedDisplay: 0,
    supportsPip: false,
    isPipActive: false,
    supportsCaptions: false,
    captionTracks: [],
    activeCaptionIndex: null,
    supportsQuality: false,
    qualityLevels: [],
    currentQualityHeight: null,
    isAutoQuality: true,
    supportsPlaybackRate: false,
    currentPlaybackRate: 1,
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleLoop: vi.fn(),
    retry: vi.fn(),
    fire: vi.fn(),
  }) as unknown as PlayerContext
}

function makeHud(isOpen: boolean) {
  return reactive({
    showHUD: true,
    isOpen,
    scheduleHide: vi.fn(),
    pauseHide: vi.fn(),
    onVideoTap: vi.fn(),
    onMouseMove: vi.fn(),
    onMouseLeave: vi.fn(),
    openControls: vi.fn(),
    closeControls: vi.fn(),
    keepOpen: vi.fn(),
    suppressMouseLeave: vi.fn(),
  }) as unknown as HudContext
}

function mountOverlay({ fullscreen = false, popupOpen = true } = {}) {
  return mount(PlayerOverlay, {
    global: {
      provide: {
        [PlayerKey as symbol]: makePlayer(fullscreen),
        [HudKey as symbol]: makeHud(popupOpen),
        [PlaylistKey as symbol]: NO_PLAYLIST,
        [ActionKey as symbol]: ref(null),
      },
    },
    attachTo: document.body,
  })
}

/** The hide rule is `:has(~ .overlay__popup:not(--fs))`, which jsdom cannot evaluate, so the marker class is what the test reads. */
describe('the centred play button in fullscreen', () => {
  it('lets the popup dock to the bottom, leaving the row room above it', () => {
    const wrapper = mountOverlay({ fullscreen: true })

    expect(wrapper.find('.overlay__popup').classes()).toContain('overlay__popup--fs')
    expect(wrapper.find('.overlay__hud').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the popup centred outside fullscreen, where the row would collide with it', () => {
    const wrapper = mountOverlay({ fullscreen: false })

    expect(wrapper.find('.overlay__popup').classes()).not.toContain('overlay__popup--fs')
    wrapper.unmount()
  })

  it('shows only the play button in the row once fullscreen, not the side buttons', () => {
    const wrapper = mountOverlay({ fullscreen: true, popupOpen: false })

    expect(wrapper.find('.hud__play-wrap').exists()).toBe(true)
    expect(wrapper.findAll('.hud__btn')).toHaveLength(0)
    wrapper.unmount()
  })

  it('shows the side buttons outside fullscreen', () => {
    const wrapper = mountOverlay({ fullscreen: false, popupOpen: false })

    expect(wrapper.findAll('.hud__btn').length).toBeGreaterThan(0)
    wrapper.unmount()
  })
})
