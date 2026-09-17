import { ref } from 'vue'

interface PrebidLogEntry {
  time: string
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
}

const MAX_ENTRIES = 200

// Patched at module-eval time so nothing Prebid logs during setConfig/requestBids slips past; Prebid only exposes debug output via console.
const prebidLogs = ref<PrebidLogEntry[]>([])

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

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

/** Prebid never says outright whether the winning bid rendered; this infers it from the ad tag URL. */
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
