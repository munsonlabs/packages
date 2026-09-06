import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

// Control hasStage reactively across tests
const mockHasStage = ref(false)
vi.mock('@/composables/registries/stageRegistry', () => ({ hasStage: mockHasStage }))

// Stub child components to avoid their full initialisation
vi.mock('@/components/VideoPlaceholder.vue', () => ({
  default: defineComponent({ name: 'VideoPlaceholder', props: { src: String }, template: '<div data-testid="placeholder" />' }),
}))
vi.mock('@/components/VideoPlayer.vue', () => ({
  default: defineComponent({ name: 'VideoPlayer', props: { src: String }, template: '<div data-testid="player" />' }),
}))

const { default: VideoCard } = await import('@/components/VideoCard.vue')

const BASE = { src: 'https://www.youtube.com/watch?v=abc', title: 'Test video', lazy: false }

beforeEach(() => {
  mockHasStage.value = false
})

describe('VideoCard — stage absent', () => {
  it('renders VideoPlayer when no stage is registered', () => {
    const wrapper = mount(VideoCard, { props: BASE })
    expect(wrapper.find('[data-testid="player"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="placeholder"]').exists()).toBe(false)
  })

  it('passes src to VideoPlayer', () => {
    const wrapper = mount(VideoCard, { props: BASE })
    expect(wrapper.findComponent({ name: 'VideoPlayer' }).props('src')).toBe(BASE.src)
  })
})

describe('VideoCard — stage present', () => {
  beforeEach(() => {
    mockHasStage.value = true
  })

  it('renders VideoPlaceholder when a stage is registered', () => {
    const wrapper = mount(VideoCard, { props: BASE })
    expect(wrapper.find('[data-testid="placeholder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="player"]').exists()).toBe(false)
  })

  it('passes src to VideoPlaceholder', () => {
    const wrapper = mount(VideoCard, { props: BASE })
    expect(wrapper.findComponent({ name: 'VideoPlaceholder' }).props('src')).toBe(BASE.src)
  })
})
