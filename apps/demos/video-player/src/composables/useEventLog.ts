import { ref } from 'vue'
import type { StateChangeEvent } from '@munsonlabs/video-player'
import { videos, adVideos, prebidVideos, captionVideos, qualityVideos } from '../data/demoVideos'

interface LogEntry {
  time: string
  type: string
  ct: string
  dur: string
  src: string
}

/** Accepts real player events plus demo-only types like 'save'/'unsave' from the custom action. */
type LoggableEvent = Omit<StateChangeEvent, 'type'> & { type: string }

// Module-scoped so every component that calls useEventLog() shares the same log.
const log = ref<LogEntry[]>([])

function addLog(e: LoggableEvent): void {
  const title =
    [...videos, ...adVideos, ...prebidVideos, ...captionVideos, ...qualityVideos].find((v) => v.src === e.src)?.title ?? e.src.split('/').pop() ?? '—'
  log.value.unshift({
    time: new Date().toLocaleTimeString('en', { hour12: false }),
    type: e.type,
    ct: e.currentTime != null ? `${e.currentTime.toFixed(1)}s` : '—',
    dur: e.duration ? `/ ${e.duration.toFixed(1)}s` : '',
    src: title,
  })
  if (log.value.length > 60) log.value.length = 60
}

function clearLog(): void {
  log.value = []
}

export function useEventLog() {
  return { log, addLog, clearLog }
}
