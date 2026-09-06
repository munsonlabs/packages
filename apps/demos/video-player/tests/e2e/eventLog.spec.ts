import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { defineComponent } from 'vue'
import { render } from 'vitest-browser-vue'
import VideoPanel from '../../src/components/VideoPanel.vue'
import EventLogPopover from '../../src/components/EventLogPopover.vue'
import { useEventLog } from '../../src/composables/useEventLog'
import { FIXTURE_VIDEO, waitFor, waitForLogged } from './helpers'

// Mirrors how App.vue wires these two panels together: both talk to the same module-scoped
// useEventLog() state, so this is what actually proves playing a video surfaces in the log UI.
const TestHost = defineComponent({
  components: { VideoPanel, EventLogPopover },
  template: `
    <div>
      <EventLogPopover />
      <VideoPanel heading="Test" :videos="[video]" />
    </div>
  `,
  data: () => ({ video: FIXTURE_VIDEO }),
})

beforeEach(() => {
  useEventLog().clearLog()
})

describe('Event log integration', () => {
  it('logs a play event from the video panel and shows it in the Events popover', async () => {
    const screen = await render(TestHost)

    // No badge until something has actually played.
    expect(screen.container.querySelector('.popover-btn__badge')).toBeNull()

    // Lazy-loaded by default - one click both activates and autoplays the card.
    await screen.getByRole('button', { name: 'Play' }).click()
    await waitForLogged('play')

    await waitFor(() => screen.container.querySelector('.popover-btn__badge')?.textContent === '1', 'the Events badge to show 1')

    await screen.getByRole('button', { name: /Events/ }).click()

    const entry = screen.container.querySelector('.log__entry')!
    expect(entry.querySelector('.log__type--play')).not.toBeNull()
    // Not one of demoVideos.ts's known sources, so the log falls back to the src's filename
    // rather than this VideoEntry's own `title` - see useEventLog's addLog().
    expect(entry.querySelector('.log__src')?.textContent).toBe('flower.mp4')
  })
})
