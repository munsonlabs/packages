import { describe, expect, it } from 'vite-plus/test'
import { parseImport } from '@/dialogs/parseImport'
import { card } from '@test/fixtures'

describe('parseImport', () => {
  it('a single widget replaces the one being edited, keeping its id', () => {
    const pasted = { ...card(), id: 'someone-elses', name: 'Pasted' }
    const result = parseImport(JSON.stringify(pasted), 'card')
    expect(result.kind).toBe('widget')
    if (result.kind === 'widget') expect(result.definition).toMatchObject({ id: 'card', name: 'Pasted', root: pasted.root })
  })

  it('a library, or a bare list, goes to the app untouched', () => {
    const library = { format: 'loom-library', version: 1, widgets: [card()] }
    expect(parseImport(JSON.stringify(library), 'card')).toEqual({ kind: 'library', data: library })
    expect(parseImport(JSON.stringify([card()]), 'card')).toEqual({ kind: 'library', data: [card()] })
  })

  it('refuses what is neither', () => {
    expect(() => parseImport('{ "hello": "world" }', 'card')).toThrow('Not a widget definition or a library')
    expect(() => parseImport('not json', 'card')).toThrow()
  })
})
