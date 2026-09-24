import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import ControlsPopup from '@/ui/overlay/ControlsPopup.vue'
import { PlayerKey, HudKey, ActionKey, PlaylistKey, NO_PLAYLIST } from '@/ui/player/playerContext'
import type { PlayerContext, HudContext } from '@/ui/player/playerContext'

function makePlayer(overrides: Record<string, unknown> = {}) {
  return reactive({
    isPlaying: false,
    isMuted: false,
    isAudible: true,
    isLive: false,
    isBuffering: false,
    isError: false,
    isFullscreen: false,
    isLooping: false,
    currentTime: 0,
    duration: 120,
    currentVolume: 1,
    bufferedDisplay: 0,
    supportsPip: true,
    isPipActive: false,
    supportsCaptions: false,
    captionTracks: [],
    activeCaptionIndex: null,
    supportsQuality: false,
    qualityLevels: [],
    currentQualityHeight: null,
    isAutoQuality: true,
    supportsPlaybackRate: true,
    currentPlaybackRate: 1,
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleLoop: vi.fn(),
    togglePip: vi.fn(),
    setVolume: vi.fn(),
    setPlaybackRate: vi.fn(),
    setCaptionTrack: vi.fn(),
    setQuality: vi.fn(),
    seek: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    fire: vi.fn(),
    ...overrides,
  }) as unknown as PlayerContext
}

function makeHud() {
  return reactive({
    showHUD: true,
    isOpen: true,
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

function mountPopup(player = makePlayer(), hud = makeHud()) {
  const wrapper = mount(ControlsPopup, {
    global: {
      provide: {
        [PlayerKey as symbol]: player,
        [HudKey as symbol]: hud,
        [PlaylistKey as symbol]: NO_PLAYLIST,
        [ActionKey as symbol]: ref(null),
      },
    },
    attachTo: document.body,
  })
  return { wrapper, player, hud }
}

beforeEach(() => {
  // The panel swap animates through a FLIP, which needs layout the jsdom has none of.
  Element.prototype.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 300, height: 80, bottom: 80, right: 300 })) as never
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('ControlsPopup lifecycle', () => {
  it('announces itself opening and closing, naming its own element', () => {
    const { wrapper, player } = mountPopup()

    expect(player.fire).toHaveBeenCalledWith('controlsopen', expect.objectContaining({ element: expect.anything() }))

    wrapper.unmount()
    expect(player.fire).toHaveBeenCalledWith('controlsclose', expect.objectContaining({ element: expect.anything() }))
  })

  it('stops listening to the document once unmounted', () => {
    const removed: string[] = []
    const spy = vi.spyOn(document, 'removeEventListener').mockImplementation(((type: string) => {
      removed.push(type)
    }) as never)

    mountPopup().wrapper.unmount()

    expect(removed).toContain('click')
    expect(removed).toContain('touchend')
    spy.mockRestore()
  })
})

describe('closing by clicking away', () => {
  it('closes when the click lands outside the popup', () => {
    const { hud } = mountPopup()

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(hud.closeControls).toHaveBeenCalled()
  })

  it('ignores an outside click in fullscreen, where a dismissal could not stick', () => {
    const { hud } = mountPopup(makePlayer({ isFullscreen: true }))

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(hud.closeControls).not.toHaveBeenCalled()
  })

  it('stays open when the click lands inside it', () => {
    const { wrapper, hud } = mountPopup()

    wrapper.find('.controls').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(hud.closeControls).not.toHaveBeenCalled()
  })
})

describe('swapping panels', () => {
  it('replaces the main row with the volume panel, and back again', async () => {
    const { wrapper, hud } = mountPopup()
    expect(wrapper.find('.controls__seek').exists()).toBe(true)

    await wrapper.find('.controls__btn--volume').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('.controls__vol-body').exists()).toBe(true)
    expect(wrapper.find('.controls__seek').exists()).toBe(false)
    /** The swap moves the pointer over a different element, which would otherwise read as leaving the HUD. */
    expect(hud.suppressMouseLeave).toHaveBeenCalled()

    await wrapper.find('.controls__btn').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('.controls__seek').exists()).toBe(true)
  })

  it('opens the more menu in place of the main row', async () => {
    const { wrapper } = mountPopup()

    await wrapper.find('.controls__btn--more').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('.controls__more-body').exists()).toBe(true)
    expect(wrapper.find('.controls__seek').exists()).toBe(false)
  })
})

describe('what the row shows', () => {
  it('hides the scrubber on a live stream', () => {
    expect(
      mountPopup(makePlayer({ isLive: true }))
        .wrapper.find('.controls__seek')
        .exists(),
    ).toBe(false)
  })

  it('swaps the play button for the spinner while buffering', () => {
    const { wrapper } = mountPopup(makePlayer({ isBuffering: true }))

    expect(wrapper.find('.ml-video-buffering').exists()).toBe(true)
    expect(wrapper.find('.ml-video-play-button').exists()).toBe(false)
  })
})
