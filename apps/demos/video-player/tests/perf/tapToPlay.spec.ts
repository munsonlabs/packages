import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, type Page, type Browser } from '@playwright/test'
import { PERF_PORT } from '../../playwright.perf.config'
import { PERF_MEDIA_PATH, PERF_LATENCY_MS } from './mediaServer'

/** Different host from the page's `localhost` on purpose - see mediaServer.ts. */
const MEDIA_URL = `http://127.0.0.1:${PERF_PORT}${PERF_MEDIA_PATH}`
const RUNS = Number(process.env.PERF_RUNS ?? 7)

interface Sample {
  /** Gesture (click, capture phase) to the stage <video>'s first `playing` event. */
  tapToPlaying: number
  /** Media requests the page had already issued before the tap - non-zero would mean something is prefetching. */
  mediaRequestsBeforeTap: number
  mediaRequestsAfterTap: number
  afterTapTransferBytes: number[]
  afterTapDurationsMs: number[]
}

async function measureOnce(page: Page): Promise<Sample> {
  await page.goto(`/perf.html?src=${encodeURIComponent(MEDIA_URL)}`)
  const playButton = page.getByRole('button', { name: 'Play' })
  await expect(playButton).toBeVisible()

  // A viewer sees the card before tapping it - give the page the same settle time.
  await page.waitForTimeout(1000)

  await page.evaluate((mediaPath) => {
    const w = window as typeof window & { __perf: { tap: number; playing: number; before: number } }
    w.__perf = { tap: 0, playing: 0, before: performance.getEntriesByType('resource').filter((e) => e.name.includes(mediaPath)).length }
    document.addEventListener('click', () => (w.__perf.tap ||= performance.now()), { capture: true, once: true })
    // Media events don't bubble, but capture-phase listeners on an ancestor still see them.
    document.addEventListener(
      'playing',
      (e) => {
        if (!w.__perf.playing && (e.target as Element).closest('.stage')) w.__perf.playing = performance.now()
      },
      true,
    )
  }, PERF_MEDIA_PATH)

  await playButton.click()
  await page.waitForFunction(() => (window as typeof window & { __perf: { playing: number } }).__perf.playing > 0)

  return page.evaluate((mediaPath) => {
    const w = window as typeof window & { __perf: { tap: number; playing: number; before: number } }
    const entries = performance.getEntriesByType('resource').filter((e) => e.name.includes(mediaPath)) as PerformanceResourceTiming[]
    const after = entries.slice(w.__perf.before)
    return {
      tapToPlaying: w.__perf.playing - w.__perf.tap,
      mediaRequestsBeforeTap: w.__perf.before,
      mediaRequestsAfterTap: after.length,
      /** 0 transferSize on a request means the browser served it from cache (the media server sends Timing-Allow-Origin). */
      afterTapTransferBytes: after.map((e) => e.transferSize),
      afterTapDurationsMs: after.map((e) => Math.round(e.duration)),
    }
  }, PERF_MEDIA_PATH)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

interface Summary {
  scenario: string
  runs: number
  serverLatencyMs: number
  medianMs: number
  minMs: number
  maxMs: number
  mediaRequestsBeforeTap: number
  mediaRequestsAfterTap: number
  samplesMs: number[]
  afterTapRequests: string[]
}

async function measureScenario(browser: Browser, scenario: string): Promise<Summary> {
  const samples: Sample[] = []
  // One extra, discarded iteration first: the dev server's on-demand module compile and the
  // browser's cold JIT only ever hit the first page load, and neither is what we're measuring.
  for (let i = 0; i <= RUNS; i++) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const sample = await measureOnce(page)
    if (i > 0) samples.push(sample)
    await context.close()
  }

  const times = samples.map((s) => s.tapToPlaying)
  return {
    scenario,
    runs: RUNS,
    serverLatencyMs: PERF_LATENCY_MS,
    medianMs: Math.round(median(times)),
    minMs: Math.round(Math.min(...times)),
    maxMs: Math.round(Math.max(...times)),
    mediaRequestsBeforeTap: median(samples.map((s) => s.mediaRequestsBeforeTap)),
    mediaRequestsAfterTap: median(samples.map((s) => s.mediaRequestsAfterTap)),
    samplesMs: times.map((t) => Math.round(t)),
    afterTapRequests: samples.map((s) => s.afterTapDurationsMs.map((d, i) => `${d}ms/${s.afterTapTransferBytes[i]}B`).join(' ')),
  }
}

/**
 * The package's own share of tap-to-play for a plain mp4: everything from the gesture to the
 * stage video's first `playing`, with one media round trip of PERF_LATENCY_MS in the way. A jump
 * here that isn't a jump in serverLatencyMs is a regression in the mount path.
 */
test('stable mp4: card tap -> stage playing', async ({ browser }) => {
  const result = await measureScenario(browser, 'card tap -> stage playing (stable mp4)')

  const { samplesMs: _s, afterTapRequests: _r, ...row } = result
  console.log(`\n[perf] ${RUNS} runs, ${PERF_LATENCY_MS}ms server latency per media request`)
  console.table([row])
  mkdirSync('test-results/perf', { recursive: true })
  writeFileSync('test-results/perf/tap-to-play.json', JSON.stringify(result, null, 2))
  test.info().annotations.push({ type: 'perf', description: JSON.stringify(row) })

  // Not a budget, only a hang guard - the numbers themselves are the deliverable.
  expect(result.medianMs).toBeLessThan(5000)
})
