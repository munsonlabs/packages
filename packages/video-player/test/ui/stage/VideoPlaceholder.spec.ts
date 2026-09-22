import { describe, it, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import VideoPlaceholder from '@/ui/stage/VideoPlaceholder.vue'

const ENTRY = {
  src: 'https://example.test/bunny.mp4',
  label: 'Big Buck Bunny (HLS)',
  poster: 'https://example.test/poster.jpg',
}

function mountCard(props: Record<string, unknown> = {}) {
  return mount(VideoPlaceholder, { props: { ...ENTRY, ...props } })
}

/**
 * The footer, the poster and the button each read a different thing, and a local binding named
 * after a prop silently takes the prop's place in the template. That is how all three once ended
 * up saying "Play": the card named the control instead of the video.
 */
describe('VideoPlaceholder names the video, not the control', () => {
  it('captions the card with the entry label', () => {
    expect(mountCard().find('.placeholder__title').text()).toBe('Big Buck Bunny (HLS)')
  })

  it('drops the caption entirely when an entry has no label', () => {
    expect(mountCard({ label: '' }).find('.placeholder__footer').exists()).toBe(false)
  })

  it('names the play button after the video, so sibling cards differ', () => {
    const a = mountCard().find('button').attributes('aria-label')
    const b = mountCard({ label: 'Apple bipbop (HLS, captioned)' }).find('button').attributes('aria-label')

    expect(a).toBe('Play Big Buck Bunny (HLS)')
    expect(b).toBe('Play Apple bipbop (HLS, captioned)')
    expect(a).not.toBe(b)
  })

  it('falls back to the bare action when there is no video to name', () => {
    expect(mountCard({ label: '' }).find('button').attributes('aria-label')).toBe('Play')
  })

  it('describes the poster with the video name, so a broken image still says what it was', () => {
    expect(mountCard().find('.placeholder__poster').attributes('alt')).toBe('Big Buck Bunny (HLS)')
  })

  it('leaves the poster alt empty when there is no name to give it', () => {
    expect(mountCard({ label: '' }).find('.placeholder__poster').attributes('alt')).toBe('')
  })
})
