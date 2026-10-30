import { describe, expect, it } from 'vite-plus/test'
import { toReadableUrl } from '@/utils/url'

describe('toReadableUrl', () => {
  it('drops the scheme, www., query, hash and trailing slash', () => {
    expect(toReadableUrl('https://www.acme.news/2026/10/tides-rising/?utm_source=x#ml-t=4,9')).toBe('acme.news/2026/10/tides-rising')
  })

  it('keeps a bare domain and a port', () => {
    expect(toReadableUrl('https://acme.news/')).toBe('acme.news')
    expect(toReadableUrl('http://localhost:5173/watch')).toBe('localhost:5173/watch')
  })
})
