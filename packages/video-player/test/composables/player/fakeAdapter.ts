import { vi } from 'vite-plus/test'
import { createEmitter } from '@/composables/player/emitter'
import type { PlaybackAdapter } from '@/types/playback'

export let emitter = createEmitter()

export function resetEmitter(): void {
  emitter = createEmitter()
}

export const fakeAdapter = {
  el: document.createElement('video'),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  paused: () => true,
  currentTime: () => 0,
  setCurrentTime: vi.fn(),
  duration: () => 100,
  volume: () => 1,
  setVolume: vi.fn(),
  muted: () => false,
  setMuted: vi.fn(),
  playbackRate: () => 1,
  setPlaybackRate: vi.fn(),
  bufferedEnd: () => 0,
  error: () => null,
  setSrc: vi.fn(),
  supportsPlaybackRate: () => true,
  supportsCaptions: () => false,
  getCaptionTracks: () => [],
  setCaptionTrack: vi.fn(),
  getActiveCaptionTrack: () => null,
  supportsQuality: () => false,
  getQualityLevels: () => [],
  getCurrentQuality: () => null,
  isAutoQuality: () => true,
  setQuality: vi.fn(),
  supportsPip: () => false,
  isPipActive: () => false,
  togglePip: vi.fn(),
  enterFullscreen: vi.fn(),
  exitFullscreen: vi.fn(),
  on: (event: string, fn: (...args: unknown[]) => void) => emitter.on(event, fn),
  off: (event: string, fn: (...args: unknown[]) => void) => emitter.off(event, fn),
  dispose: vi.fn(),
} as unknown as PlaybackAdapter
