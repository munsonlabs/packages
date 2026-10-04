import { describe, expect, it } from 'vite-plus/test'
import { middleEllipsis, readableUrl } from '@/utils/url'

describe('readableUrl', () => {
  it('strips the scheme, www., query, hash and trailing slash', () => {
    expect(readableUrl('https://www.acme.news/2026/10/tides-rising?utm=x#ml-t=4,9')).toBe('acme.news/2026/10/tides-rising')
    expect(readableUrl('http://acme.news/2026/10/tides-rising/')).toBe('acme.news/2026/10/tides-rising')
    expect(readableUrl('https://WWW.Acme.News/Tides')).toBe('acme.news/Tides')
    expect(readableUrl('https://user:secret@acme.news/a')).toBe('acme.news/a')
  })

  it('keeps a domain with no path, and keeps ports', () => {
    expect(readableUrl('https://www.acme.news/')).toBe('acme.news')
    expect(readableUrl('https://acme.news?x=1#ml-t=1,2')).toBe('acme.news')
    expect(readableUrl('http://localhost:3000/')).toBe('localhost:3000')
    expect(readableUrl('https://acme.news:8443/live/')).toBe('acme.news:8443/live')
  })

  it('decodes the path, and shows an internationalised domain as the URL carries it', () => {
    expect(readableUrl('https://xn--mnchen-3ya.de/stra%C3%9Fe/')).toBe('xn--mnchen-3ya.de/straße')
  })

  it('reads an address without a scheme, and leaves other text alone', () => {
    expect(readableUrl('acme.news/2026/tides/')).toBe('acme.news/2026/tides')
    expect(readableUrl('Read it on Acme')).toBe('Read it on Acme')
    expect(readableUrl('')).toBe('')
  })

  it('drops whole segments from the middle first, keeping the domain and the slug', () => {
    const url = 'https://www.acme.news/2026/10/03/climate/tides-rising?utm=x'
    expect(readableUrl(url, 100)).toBe('acme.news/2026/10/03/climate/tides-rising')
    expect(readableUrl(url, 35)).toBe('acme.news/2026/10/03/…/tides-rising')
    expect(readableUrl(url, 32)).toBe('acme.news/2026/10/…/tides-rising')
    expect(readableUrl(url, 26)).toBe('acme.news/…/tides-rising')
    for (const width of [26, 30, 35, 40]) {
      const shown = readableUrl(url, width)
      expect(Array.from(shown).length).toBeLessThanOrEqual(width)
      expect(shown.startsWith('acme.news/')).toBe(true)
      expect(shown.endsWith('/tides-rising')).toBe(true)
    }
  })

  it('cuts the slug in its middle only when even domain/…/slug is too wide', () => {
    const url = 'https://acme.news/2026/the-tides-are-rising-faster-than-anyone-expected'
    const shown = readableUrl(url, 30)
    expect(shown.startsWith('acme.news/…/')).toBe(true)
    expect(shown).toMatch(/^acme\.news\/…\/the-.*….*expected$/)
    expect(Array.from(shown).length).toBeLessThanOrEqual(30)
    // One segment: no "…/" to stand for dropped segments.
    expect(readableUrl('https://acme.news/the-tides-are-rising-faster-than-expected', 24)).toMatch(/^acme\.news\/the-.*….*ted$/)
    // Not even the domain fits: the whole text is cut in the middle.
    const tiny = readableUrl('https://a-very-long-subdomain.acme.news/story', 12)
    expect(Array.from(tiny).length).toBeLessThanOrEqual(12)
    expect(tiny).toContain('…')
  })

  it('measures with the given function, such as ctx.measureText', () => {
    // Wide characters count double: the result fits the measured width, not the character count.
    const measure = (text: string) => Array.from(text).reduce((sum, char) => sum + (/[a-z]/.test(char) ? 2 : 1), 0)
    const shown = readableUrl('https://acme.news/2026/10/tides-rising', 45, measure)
    expect(measure(shown)).toBeLessThanOrEqual(45)
    expect(shown).toBe('acme.news/…/tides-rising')
  })
})

describe('middleEllipsis', () => {
  it('keeps both ends, favouring the start', () => {
    expect(middleEllipsis('abcdefghij', 10)).toBe('abcdefghij')
    expect(middleEllipsis('abcdefghij', 6)).toBe('abc…ij')
    expect(middleEllipsis('abcdefghij', 1)).toBe('…')
  })

  it('never splits a character outside the BMP', () => {
    const shown = middleEllipsis('🎬 family news 🎬', 7)
    expect(shown.startsWith('🎬')).toBe(true)
    expect(shown.endsWith('🎬')).toBe(true)
  })
})
