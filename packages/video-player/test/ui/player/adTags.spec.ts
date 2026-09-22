import { describe, it, expect } from 'vite-plus/test'
import { applyAdTagParams } from '@/ui/player/adapterMount'

describe('applyAdTagParams', () => {
  it('fills a {macro} token wherever it appears in the url, even nested inside a differently-named query param', () => {
    const url = 'https://ads.example.com/gampad/ads?iu={adUnit}&vid={referenceId}'
    const result = applyAdTagParams(url, { adUnit: 'network/section', referenceId: 'abc123' })
    expect(result).toBe('https://ads.example.com/gampad/ads?iu=network%2Fsection&vid=abc123')
  })

  it('overwrites a same-named macro that sits alone as a query value (e.g. rdid={rdid})', () => {
    const url = 'https://ads.example.com/gampad/ads?rdid={rdid}&is_lat={is_lat}'
    const result = applyAdTagParams(url, { rdid: 'device-1', is_lat: '0' })
    expect(result).toBe('https://ads.example.com/gampad/ads?rdid=device-1&is_lat=0')
  })

  it('is a no-op for a key with no matching token in the url — it does not add new query params', () => {
    const url = 'https://ads.example.com/gampad/ads?env=vp'
    const result = applyAdTagParams(url, { cust_params: 'pageType=article' })
    expect(result).toBe(url)
  })

  it('leaves a url untouched when there are no params', () => {
    const url = 'https://ads.example.com/gampad/ads?env=vp'
    expect(applyAdTagParams(url, undefined)).toBe(url)
    expect(applyAdTagParams(url, {})).toBe(url)
  })

  it('skips undefined/null/empty values', () => {
    const url = 'https://ads.example.com/gampad/ads?iu={adUnit}'
    const result = applyAdTagParams(url, { adUnit: undefined, other: '' } as unknown as Record<string, string>)
    expect(result).toBe(url)
  })

  it('leaves a non-templated (or invalid) url untouched', () => {
    expect(applyAdTagParams('not-a-real-url', { foo: 'bar' })).toBe('not-a-real-url')
  })
})
