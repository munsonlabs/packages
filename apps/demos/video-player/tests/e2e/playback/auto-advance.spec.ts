import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { videos } from '../../fixtures/videos'
import { mountStage, waitFor } from './harness'

const [first, second] = videos.playlist

// VideoStage reads this once in setup, so it has to be in place before mounting.
const AUTO_ADVANCE_KEY = 'player:autoAdvance'

describe('playlist / auto-advance (VideoStage)', () => {
  beforeEach(() => {
    localStorage.removeItem(AUTO_ADVANCE_KEY)
  })

  it('selecting a card plays that entry in the stage, and knows what comes next', async () => {
    const { stage, sink, selectCard, stageVideo } = await mountStage(videos.playlist)

    await selectCard(0)

    const play = await sink.next('play')
    expect(play.src).toBe(first.src)
    expect(stageVideo()?.paused).toBe(false)
    expect(stage.hasNext).toBe(true)
  })

  it('with auto-advance on, finishing an entry starts the next one', async () => {
    localStorage.setItem(AUTO_ADVANCE_KEY, 'true')
    const { stage, sink, selectCard } = await mountStage(videos.playlist)
    await selectCard(0)
    await sink.next('play')

    stage.seek(90)
    const ended = await sink.next('ended')
    expect(ended.src).toBe(first.src)

    await waitFor(() => sink.of('play').some((e) => e.src === second.src), 'the second entry to start playing')
    expect(stage.hasNext).toBe(false)
  })

  it('with auto-advance off, finishing an entry stops', async () => {
    const { stage, sink, selectCard } = await mountStage(videos.playlist)
    await selectCard(0)
    await sink.next('play')

    stage.seek(90)
    await sink.next('ended')
    await new Promise((r) => setTimeout(r, 500))

    expect(sink.of('play').some((e) => e.src === second.src)).toBe(false)
    expect(stage.hasEnded).toBe(true)
  })

  it('playNext moves to the next entry on demand', async () => {
    const { stage, sink, selectCard } = await mountStage(videos.playlist)
    await selectCard(0)
    await sink.next('play')

    stage.playNext()

    await waitFor(() => sink.of('play').some((e) => e.src === second.src), 'the second entry to start playing')
    expect(stage.hasNext).toBe(false)
  })
})
