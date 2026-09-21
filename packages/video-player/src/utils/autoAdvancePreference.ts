import { STORAGE_AUTO_ADVANCE_KEY as STORAGE_KEY } from '@/constants'
import { readStorage, writeStorage } from '@/utils/storage'

export function getAutoAdvance(): boolean {
  return readStorage(STORAGE_KEY) === 'true'
}

export function saveAutoAdvance(enabled: boolean): void {
  writeStorage(STORAGE_KEY, String(enabled))
}
