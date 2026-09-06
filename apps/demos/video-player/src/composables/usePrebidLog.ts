import { ref } from 'vue'

interface PrebidLogEntry {
  time: string
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
}

const MAX_ENTRIES = 200

// Module-scoped: patch console.* once, at module-eval time (before Vue mounts and well before the
// async Prebid script downloads), so nothing it logs during setConfig/addAdUnits/requestBids slips
// past us. Prebid never exposes its debug output through an API — setConfig({ debug: true }) only
// routes it through console.log/console.info, prefixed with a "%cPrebid.js:" format string.
const prebidLogs = ref<PrebidLogEntry[]>([])

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** Strips the %c format directives Prebid uses for console styling, and the CSS-string args that go with them. */
function formatArgs(args: unknown[]): string {
  const [first, ...rest] = args
  if (typeof first === 'string' && first.includes('%c')) {
    const styleCount = (first.match(/%c/g) ?? []).length
    const text = first.replace(/%c/g, '').trim()
    return [text, ...rest.slice(styleCount).map(safeStringify)].filter(Boolean).join(' ')
  }
  return args.map(safeStringify).join(' ')
}

function looksLikePrebid(args: unknown[]): boolean {
  return typeof args[0] === 'string' && args[0].toLowerCase().includes('prebid')
}

function patch(level: PrebidLogEntry['level']): (...args: unknown[]) => void {
  const original = console[level].bind(console)
  return (...args: unknown[]) => {
    original(...args)
    if (!looksLikePrebid(args)) return
    prebidLogs.value.push({
      time: new Date().toLocaleTimeString('en', { hour12: false }),
      level,
      message: formatArgs(args),
    })
    if (prebidLogs.value.length > MAX_ENTRIES) prebidLogs.value.shift()
  }
}

console.log = patch('log')
console.info = patch('info')
console.warn = patch('warn')
console.error = patch('error')

/*
 * Prebid's own debug output tells you about the auction (bids received, timings) but never says
 * outright whether the ad that's about to play actually reflects a winning bid. The package's
 * resolveHeaderBiddingAdTagUrl() (adapters/ads/prebid.ts) decides that by calling
 * pbjs.adServers.gam.buildVideoUrl() — it returns a real URL on a fill, null/undefined on no fill.
 * Wrapping that one function (once Prebid's queue confirms the module is loaded) gives a single,
 * unambiguous line instead of making you infer the outcome from the auction logs.
 */
function reportResolution(url: string | null | undefined): void {
  console.info(
    url ? `Prebid.js: header bidding filled — resolved ad tag: ${url}` : 'Prebid.js: header bidding did not fill — falling back to the plain ad tag.',
  )
}

function patchBuildVideoUrl(): void {
  const gam = window.pbjs?.adServers?.gam
  const original = gam?.buildVideoUrl
  if (typeof original !== 'function' || !gam) return
  gam.buildVideoUrl = (options) => {
    const url = original.call(gam, options)
    reportResolution(url)
    return url
  }
}

if (typeof window !== 'undefined') {
  window.pbjs = window.pbjs ?? { que: [] }
  window.pbjs.que.push(patchBuildVideoUrl)
}

function clearPrebidLogs(): void {
  prebidLogs.value = []
}

export function usePrebidLog() {
  return { prebidLogs, clearPrebidLogs }
}
