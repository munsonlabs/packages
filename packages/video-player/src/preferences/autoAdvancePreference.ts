import { readStorage, writeStorage } from '@/preferences/storage'

export const STORAGE_AUTO_ADVANCE_KEY = 'player:autoAdvance'

export function getAutoAdvance(): boolean {
  return readStorage(STORAGE_AUTO_ADVANCE_KEY) === 'true'
}

export function saveAutoAdvance(enabled: boolean): void {
  writeStorage(STORAGE_AUTO_ADVANCE_KEY, String(enabled))
}
