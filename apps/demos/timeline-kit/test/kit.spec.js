import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { createLibrary, loadLibrary, matchDefinition, validateDefinition, Widget } from '@munsonlabs/loom'
import { createBridge, createStubNative } from 'bolt-bridge-stub'
import { composableSource } from '@/sources/shared'
import { feedOf, stories, timeAgo, timelineKit as kit, videoUrl, widgets } from '@/index'

enableAutoUnmount(afterEach)
afterEach(() => {
  delete window.pugpigBridgeService
  delete window.pugpigUpdate
})

/** A stub native app holding `feed`, and a bridge connected to it, as a Bolt page has. */
function connect(feed = stories) {
  const native = vi.fn()
  const app = createStubNative({ stories: feed, onCall: native })
  window.pugpigBridgeService = app
  const bridge = reactive(createBridge())
  bridge.connect()
  const story = (id) => bridge.stories.find((s) => s.entry.id === id)
  return { bridge, native, story, app }
}

/** A one-story app. */
const only = (entry, extra = {}) => connect([{ entry: { id: 'x', ...entry }, ...extra }])

/**
 * Renders a story the way a feed does (pinned to the base variant unless `rules`): read from `bridge.stories` on every render, so the
 * reader's state the bridge applies (saved, read, playing) and any feed the app resends reach it.
 */
const render = ({ bridge, story }, id = 'x', { rules = false } = {}) =>
  mount(
    defineComponent({
      render: () => h(Widget, { kit, definitions: widgets, data: story(id), context: bridge, variant: rules ? undefined : 'base' }),
    }),
  )

/** Lets the native app's ping reach the bridge, and the widget re-render. */
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve))
  await nextTick()
}

describe('the kit', () => {
  it('ships valid widgets, in a library that loads in full', () => {
    for (const w of widgets) expect(validateDefinition(kit, w), w.id).toEqual([])
    const loaded = loadLibrary(kit, JSON.stringify(createLibrary(kit, widgets)))
    expect(loaded).toMatchObject({ skipped: [], missing: { sources: [], blocks: [] } })
  })

  it('has a widget for every typed story in the feed, and none for an untyped one', () => {
    const feed = feedOf(stories)
    for (const s of feed) expect(!!matchDefinition(s, widgets), s.entry.id).toBe(!!s.entry.type)
    expect(feed.map((s) => s.entry.id)).not.toContain('harbour-history')
  })

  it('picks widgets by Bolt entry type, every video platform included', () => {
    const story = (type) => ({ entry: { id: 'x', type } })
    for (const type of ['video', 'youtube', 'vimeo', 'dailymotion', 'jwplayer', 'brightcove', 'videojs'])
      expect(matchDefinition(story(type), widgets)?.id).toBe('video-tile')
    expect(matchDefinition(story('liveblog'), widgets)?.id).toBe('live-blog')
    expect(matchDefinition(story(), widgets)).toBeUndefined()
  })
})

describe('composableSource', () => {
  it('sets up as the composable, with the fields it declares', () => {
    const source = composableSource({
      id: 'demo',
      label: 'Demo',
      fields: {
        title: { type: 'string' },
        // the composable doesn't return `subtitle`: a binding to it would stay empty
        subtitle: { type: 'string' },
      },
      use: (props) => ({ title: props.story.entry.title }),
    })
    expect(source.setup({ data: { entry: { id: 'x', title: 'Hi' } }, index: 0, context: {} })).toEqual({ title: 'Hi' })
  })
})

describe('composables', () => {
  it('turn each video platform’s fields into a playable URL', () => {
    expect(videoUrl({ id: 'a', type: 'youtube', videoid: 'abc' })).toBe('https://www.youtube.com/watch?v=abc')
    expect(videoUrl({ id: 'a', type: 'jwplayer', videokey: 'K3y' })).toBe('jwplayer://K3y')
    expect(videoUrl({ id: 'a', type: 'brightcove', brightcove_account_id: '1', brightcove_player: 'p', brightcove_video_id: '9' })).toBe(
      'https://players.brightcove.net/1/p_default/index.html?videoId=9',
    )
    expect(videoUrl({ id: 'a', type: 'youtube' })).toBeUndefined()
  })

  it('say how long ago, then switch to a date', () => {
    const now = Date.parse('2026-10-10T12:00:00Z')
    expect(timeAgo('2026-10-10T11:59:30Z', 7, now)).toBe('Just now')
    expect(timeAgo('2026-10-10T11:00:00Z', 7, now)).toBe('1 hour ago')
    expect(timeAgo('2026-10-07T12:00:00Z', 7, now)).toBe('3 days ago')
    expect(timeAgo('2026-09-01T12:00:00Z', 7, now)).not.toContain('ago')
  })
})

describe('widgets, through the bridge', () => {
  it('article: saves via the native app without opening, and shows progress', async () => {
    const app = only({ type: 'article', title: 'Headline', readtime: 4, published: new Date().toISOString() }, { progress: 0.5 })
    const wrapper = render(app)
    expect(wrapper.find('[data-node-id="read-time"]').text()).toBe('· 4 min read')
    expect(wrapper.find('[data-node-id="progress"] .w-progress-bar').attributes('style')).toContain('width: 50%')

    await wrapper.find('[data-node-id="save"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('setSaved', expect.objectContaining({ saved: true }))
    expect(app.native).not.toHaveBeenCalledWith('viewArticle', expect.anything())
    await settle()
    expect(app.bridge.saved.has('x')).toBe(true)
    expect(wrapper.find('[data-node-id="save"]').text()).toBe('Saved')
  })

  it('article: breaking news gets its own variant', () => {
    const wrapper = render(only({ type: 'article', title: 'Now', breaking: true }), 'x', { rules: true })
    expect(wrapper.find('[data-widget]').attributes('data-variant')).toBe('breaking')
    expect(wrapper.find('[data-node-id="label"]').classes()).toContain('is-alert')
  })

  it('article: opens a related story with that story, and the app marks it read', async () => {
    const app = connect()
    const wrapper = render(app, 'harbour')
    const rows = wrapper.findAll('[data-node-id="related-title"]')
    expect(rows.map((r) => r.text())).toEqual([
      'Ten years, four plans: how the harbour scheme got here',
      'Residents split over what the decision means for rents',
    ])
    await rows[1].trigger('click')
    expect(app.native).toHaveBeenCalledWith(
      'viewArticle',
      expect.objectContaining({ story: expect.objectContaining({ entry: expect.objectContaining({ id: 'harbour-reaction' }) }) }),
    )
    await settle()
    expect(app.story('harbour-reaction').read).toBe(true)
  })

  it('event: the app adds it to the calendar and sends the feed again', async () => {
    const app = only({ type: 'event', title: 'Gig', startdate: '2026-11-01T10:00:00Z', enddate: '2026-11-01T12:00:00Z', location: 'The Mill' })
    const wrapper = render(app)
    expect(wrapper.find('[data-node-id="day"]').text()).toBe(String(new Date('2026-11-01T10:00:00Z').getDate()))
    await wrapper.find('[data-node-id="calendar"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('addToCalendar', expect.anything())
    await settle()
    expect(wrapper.find('[data-node-id="calendar"]').text()).toBe('In your calendar')
  })

  it('gallery: one slide per photo, with its caption', () => {
    const wrapper = render(connect(), 'coast-gallery')
    expect(wrapper.find('[data-node-id="photos"]').classes()).toContain('is-carousel')
    expect(wrapper.findAll('[data-node-id="photo-caption"]')).toHaveLength(6)
    expect(wrapper.find('[data-node-id="count"]').text()).toBe('6 photos')
  })

  it('podcast: the native player plays it, then pauses it', async () => {
    const app = only({ type: 'podcast', title: 'Episode', show: 'Show' })
    const wrapper = render(app, 'x', { rules: true })
    await wrapper.find('[data-node-id="play"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('openAudio', expect.objectContaining({ metadata: { title: 'Episode', show: 'Show' } }))
    await settle()
    expect(wrapper.find('[data-widget]').attributes('data-variant')).toBe('playing')
    expect(wrapper.find('[data-node-id="play"]').text()).toBe('Pause')
    await wrapper.find('[data-node-id="play"]').trigger('click')
    await settle()
    expect(wrapper.find('[data-node-id="play"]').text()).toBe('Play')
  })

  it('live blog: newest posts first', () => {
    const wrapper = render(connect(), 'storm-live', { rules: true })
    expect(wrapper.find('[data-node-id="live-badge"]').text()).toBe('Live')
    const posts = wrapper.findAll('[data-node-id="update-text"]').map((p) => p.text())
    expect(posts).toHaveLength(3)
    expect(posts[0]).toContain('amber warning')
  })

  it('quote: attributes it, and follows its topic through the app', async () => {
    const app = connect()
    const wrapper = render(app, 'mayor-quote')
    expect(wrapper.find('[data-node-id="attribution"]').text()).toBe('— Rosa Mensah, Mayor')
    await wrapper.find('[data-node-id="follow"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('followTopic', { topic: 'Harbour scheme', follow: true })
    await settle()
    expect(app.bridge.followedTopics).toEqual(['Harbour scheme'])
    expect(wrapper.find('[data-node-id="follow"]').text()).toBe('Following')
  })

  it('video: plays a YouTube story through the Video block', () => {
    const wrapper = render(only({ type: 'youtube', title: 'Clip', videoid: 'abc' }), 'x', { rules: true })
    expect(wrapper.find('[data-widget]').attributes('data-widget')).toBe('video-tile')
    expect(wrapper.find('[data-node-id="player"].w-video').exists()).toBe(true)
  })
})

describe('the paywall guard', () => {
  it('shows the native paywall instead of opening a locked story, and lets saving through', async () => {
    const app = connect()
    expect(app.story('orchestra').locked).toBe(true)
    const wrapper = render(app, 'orchestra')
    await wrapper.find('[data-node-id="card"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('showPaywall', [expect.objectContaining({ entry: expect.objectContaining({ id: 'orchestra' }) }), 0])
    expect(app.native).not.toHaveBeenCalledWith('viewArticle', expect.anything())
    await wrapper.find('[data-node-id="save"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('setSaved', expect.anything())
  })

  it('guards widgets with no locked variant too, until the reader subscribes in the app', async () => {
    const app = connect()
    const wrapper = render(app, 'morning-brief', { rules: true })
    await wrapper.find('[data-node-id="play"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('showPaywall', expect.anything())
    expect(app.native).not.toHaveBeenCalledWith('openAudio', expect.anything())

    app.app.setSubscribed(true)
    await settle()
    expect(app.story('morning-brief').locked).toBe(false)
    await wrapper.find('[data-node-id="play"]').trigger('click')
    expect(app.native).toHaveBeenCalledWith('openAudio', expect.anything())
  })
})
