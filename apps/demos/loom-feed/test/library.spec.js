import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vite-plus/test'
import { createLibrary, loadLibrary } from '@munsonlabs/loom'
import { timelineKit as kit, widgets } from 'timeline-kit'

const file = 'public/timeline.library.json'
const expected = createLibrary(kit, widgets)

describe('the bundled library', () => {
  it('is the timeline kit’s example widgets (UPDATE=1 vp test rewrites it)', () => {
    if (process.env.UPDATE) writeFileSync(file, `${JSON.stringify(expected, null, 2)}\n`)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(expected)
  })

  it('loads in full with this app’s kit', () => {
    const loaded = loadLibrary(kit, readFileSync(file, 'utf8'))
    expect(loaded.widgets.map((w) => w.id)).toEqual(widgets.map((w) => w.id))
    expect(loaded).toMatchObject({ skipped: [], missing: { sources: [], blocks: [] } })
  })
})
