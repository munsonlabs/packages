import { describe, expect, it } from 'vite-plus/test'
import { fontLibrary } from '@/sources/font'

const req = (name: string, variant?: string) => ({ name, variant })

describe('fontLibrary', () => {
  it('maps via record and declines a name the record lacks', () => {
    const lib = fontLibrary({ className: 'fa', mapping: { heart: 'fa-heart' } })
    expect(lib.resolveSync!(req('heart'))).toEqual({ tag: 'i', className: 'fa fa-heart', text: undefined })
    expect(lib.resolveSync!(req('star'))).toBeUndefined()
  })

  it('uses the name itself as the modifier when nothing is configured', () => {
    const lib = fontLibrary({ className: 'fa' })
    expect(lib.resolveSync!(req('fa-heart'))).toEqual({ tag: 'i', className: 'fa fa-heart', text: undefined })
  })

  it('declines when a mapping function returns undefined', () => {
    const lib = fontLibrary({ className: 'fa', mapping: (n) => (n === 'heart' ? 'fa-heart' : undefined) })
    expect(lib.resolveSync!(req('star'))).toBeUndefined()
  })

  it('maps via function with variant', () => {
    const lib = fontLibrary({ className: 'si', mapping: (n, v = 'regular') => `${n}-${v}` })
    expect(lib.resolveSync!(req('save'))!.className).toBe('si save-regular')
    expect(lib.resolveSync!(req('save', 'active'))!.className).toBe('si save-active')
  })

  it('renders glyphs as text, omitting the modifier class when only glyphs are configured', () => {
    const lib = fontLibrary({ className: 'g', glyphs: { heart: 'e001', menu: 'menu', star: '★' } })
    expect(lib.resolveSync!(req('heart'))).toEqual({ tag: 'i', className: 'g', text: '' })
    expect(lib.resolveSync!(req('menu'))!.text).toBe('menu')
    expect(lib.resolveSync!(req('star'))!.text).toBe('★')
    expect(lib.resolveSync!(req('nope'))).toBeUndefined()
  })

  it('emits both a modifier class and a glyph when both are configured', () => {
    const lib = fontLibrary({ className: 'b', mapping: { heart: 'b-heart' }, glyphs: (n, v) => (v === 'active' ? 'e002' : 'e001') })
    expect(lib.resolveSync!(req('heart'))).toEqual({ tag: 'i', className: 'b b-heart', text: '' })
    expect(lib.resolveSync!(req('heart', 'active'))!.text).toBe('')
  })
})
