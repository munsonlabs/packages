import { readStorage, writeStorage } from '@/preferences/storage'

export const STORAGE_POSITIONS_KEY = 'player:positions'

export const POSITION_MAX_ENTRIES = 5

export const POSITION_MIN_SAVE_TIME_S = 5

interface SavedPosition {
  url: string
  time: number
}

function load(): SavedPosition[] {
  try {
    return JSON.parse(readStorage(STORAGE_POSITIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(entries: SavedPosition[]): void {
  writeStorage(STORAGE_POSITIONS_KEY, JSON.stringify(entries))
}

export function savePosition(url: string, time: number): void {
  if (time < POSITION_MIN_SAVE_TIME_S) return
  const entries = load().filter((p) => p.url !== url)
  entries.unshift({ url, time })
  persist(entries.slice(0, POSITION_MAX_ENTRIES))
}

export function getPosition(url: string): number | null {
  return load().find((p) => p.url === url)?.time ?? null
}

export function clearPosition(url: string): void {
  persist(load().filter((p) => p.url !== url))
}
