export function applyAdTagParams(adTagUrl: string, params: Record<string, string> | undefined): string {
  if (!params || !Object.keys(params).length) return adTagUrl

  let result = adTagUrl
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    result = result.split(`{${key}}`).join(encodeURIComponent(value))
  }
  return result
}
