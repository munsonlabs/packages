import { SOURCE_TYPE_PRIORITY } from '@/constants'

export function createCachedResolver<Args extends unknown[], Result>(
  resolveFn: (...args: Args) => Promise<Result>,
  keyFn: (...args: Args) => string = (...args) => String(args[0]),
): (...args: Args) => Promise<Result> {
  const cache: Record<string, Result> = {}
  return async (...args: Args): Promise<Result> => {
    const key = keyFn(...args)
    if (cache[key]) return cache[key]
    const result = await resolveFn(...args)
    cache[key] = result
    return result
  }
}

export function pickBestSource(sources: Array<{ src: string; type: string }>) {
  return sources
    .filter((s) => s.src && SOURCE_TYPE_PRIORITY.includes(s.type))
    .sort((a, b) => SOURCE_TYPE_PRIORITY.indexOf(a.type) - SOURCE_TYPE_PRIORITY.indexOf(b.type))
}
