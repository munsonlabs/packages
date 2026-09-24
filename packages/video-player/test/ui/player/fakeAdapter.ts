import { vi } from 'vite-plus/test'
import { createEmitter } from '@/adapters/emitter'
import type { PlaybackAdapter } from '@/types/playback'

export let emitter = createEmitter()

let fakePaused = true

export function resetEmitter(): void {
  emitter = createEmitter()
  fakePaused = true
  emitter.on('play', () => (fakePaused = false))
  emitter.on('playing', () => (fakePaused = false))
  emitter.on('pause', () => (fakePaused = true))
}

export const fakeAdapter = {
  el: document.createElement('video'),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  paused: () => fakePaused,
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
  load: vi.fn(),
  retry: vi.fn(),
  supportsPlaybackRate: () => true,
  captions: {
    tracks: () => [],
    active: () => null,
    select: vi.fn(),
  },
  quality: {
    levels: () => [],
    current: () => null,
    isAuto: () => true,
    select: vi.fn(),
  },
  pip: {
    isSupported: () => false,
    isActive: () => false,
    toggle: vi.fn(),
  },
  enterFullscreen: vi.fn(),
  exitFullscreen: vi.fn(),
  on: (event: string, fn: (...args: unknown[]) => void) => emitter.on(event, fn),
  off: (event: string, fn: (...args: unknown[]) => void) => emitter.off(event, fn),
  dispose: vi.fn(),
} as unknown as PlaybackAdapter
