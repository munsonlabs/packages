import { useEventLog } from '../../../src/composables/useEventLog'

export const CUES = [
  { time: 0, text: 'Cue one - opening frame.' },
  { time: 2, text: 'Cue two - two seconds in.' },
  { time: 4, text: 'Cue three - four seconds in.' },
]

export async function waitFor(predicate: () => boolean, message: string, timeout = 10_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${message}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

export async function waitForLogged(type: string) {
  const { log } = useEventLog()
  await waitFor(() => log.value.some((e) => e.type === type), `a '${type}' state-change to be logged`)
  return log.value.find((e) => e.type === type)!
}

export function loggedTime(entry: { ct: string }): number {
  return parseFloat(entry.ct)
}
