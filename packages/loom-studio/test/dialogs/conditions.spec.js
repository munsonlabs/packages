import { describe, expect, it } from 'vite-plus/test'
import { describeMatch } from '@/dialogs/conditions'

describe('conditions', () => {
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
})
