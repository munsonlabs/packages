import { describe, expect, it } from 'vite-plus/test'
import { describeMatch, matchFrom, rowsFrom, samplePaths } from '@/dialogs/conditions'

describe('conditions', () => {
  it('round-trip between a match and the form rows', () => {
    const match = [
      { path: 'entry.type', op: 'in', value: ['video', 'gallery'] },
      { path: '!entry.locked', op: 'equals', value: true },
      { path: 'entry.author', op: 'exists' },
    ]
    const rows = rowsFrom(match)
    expect(rows[1]).toEqual({ negate: true, path: 'entry.locked', op: 'equals', text: 'true' })
    expect(matchFrom(rows)).toEqual(match)
    expect(matchFrom([...rows, { negate: false, path: ' ', op: 'equals', text: 'x' }])).toEqual(match)
  })

  it('sum a match up in a line', () => {
    expect(describeMatch(undefined)).toBe('Any data')
    expect(describeMatch([{ path: 'entry.type', op: 'equals', value: 'article' }])).toBe('entry.type is article')
    expect(
      describeMatch([
        { path: '!entry.tags', op: 'includes', value: 'breaking' },
        { path: 'x', op: 'exists' },
      ]),
    ).toBe("entry.tags doesn't contain breaking +1")
  })

  it('suggest paths from the samples, without walking into lists', () => {
    expect(samplePaths([{ entry: { type: 'a', tags: ['x'] } }, { id: 1 }])).toEqual(['entry', 'entry.tags', 'entry.type', 'id'])
  })
})
