import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { hasStage, registerStage, unregisterStage } from '@/composables/registries/stageRegistry'

beforeEach(() => {
  // Drain the registry back to zero between tests
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
