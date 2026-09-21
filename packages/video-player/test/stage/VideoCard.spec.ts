import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

const mockHasStage = ref(false)
vi.mock('@/registries/stageRegistry', () => ({ hasStage: mockHasStage }))

vi.mock('@/stage/VideoPlaceholder.vue', () => ({
  default: defineComponent({ name: 'VideoPlaceholder', props: { src: String }, template: '<div data-testid="placeholder" />' }),
}))
vi.mock('@/player/VideoPlayer.vue', () => ({
  default: defineComponent({ name: 'VideoPlayer', props: { src: String }, template: '<div data-testid="player" />' }),
}))

const { default: VideoCard } = await import('@/stage/VideoCard.vue')

const BASE = { src: 'https://www.youtube.com/watch?v=abc', label: 'Test video', lazy: false }

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
