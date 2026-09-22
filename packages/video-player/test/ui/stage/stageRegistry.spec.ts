import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { hasStage, registerStage, unregisterStage, stageState } from '@/registries/stageRegistry'

beforeEach(() => {
  while (hasStage.value) unregisterStage()
})

describe('hasStage', () => {
  it('is false when no stage is registered', () => {
    expect(hasStage.value).toBe(false)
  })

  it('becomes true after registerStage', () => {
    registerStage()
    expect(hasStage.value).toBe(true)
  })

  it('returns to false after unregisterStage', () => {
    registerStage()
    unregisterStage()
    expect(hasStage.value).toBe(false)
  })

  it('stays true while multiple stages are mounted', () => {
    registerStage()
    registerStage()
    unregisterStage()
    expect(hasStage.value).toBe(true)
    unregisterStage()
    expect(hasStage.value).toBe(false)
  })
})

describe('stageState', () => {
  it('starts empty and is shared', () => {
    expect(stageState).toEqual({ currentSrc: null, isPlaying: false })
    stageState.currentSrc = 'a.mp4'
    stageState.isPlaying = true
    expect(stageState.currentSrc).toBe('a.mp4')
    stageState.currentSrc = null
    stageState.isPlaying = false
  })
})
