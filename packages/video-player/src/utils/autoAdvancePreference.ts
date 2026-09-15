import { STORAGE_AUTO_ADVANCE_KEY as STORAGE_KEY } from '@/constants'

export function getAutoAdvance(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function saveAutoAdvance(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}
