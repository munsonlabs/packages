import { describe, it, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { usePlaylist } from '@/stage/usePlaylist'
import type { VideoEntry, VideoSelectDetail } from '@/types/player'

function entry(src: string): VideoEntry {
  return { src }
}

describe('usePlaylist', () => {
  it('has no next/previous when there is no playlist', () => {
    const { hasNext, hasPrevious, nextEntry, previousEntry } = usePlaylist(ref(undefined), ref(entry('a') as VideoSelectDetail))
    expect(hasNext.value).toBe(false)
    expect(hasPrevious.value).toBe(false)
    expect(nextEntry.value).toBeNull()
    expect(previousEntry.value).toBeNull()
  })

  it('has no next/previous when nothing is currently playing', () => {
    const playlist = ref<VideoEntry[]>([entry('a'), entry('b')])
    const { hasNext, hasPrevious } = usePlaylist(playlist, ref(null))
    expect(hasNext.value).toBe(false)
    expect(hasPrevious.value).toBe(false)
  })

  it('has no next/previous when the current video is not in the playlist', () => {
    const playlist = ref<VideoEntry[]>([entry('a'), entry('b')])
    const current = ref<VideoSelectDetail | null>(entry('z') as VideoSelectDetail)
    const { hasNext, hasPrevious } = usePlaylist(playlist, current)
    expect(hasNext.value).toBe(false)
    expect(hasPrevious.value).toBe(false)
  })

  it("reports next/previous entries based on the current video's position", () => {
    const playlist = ref<VideoEntry[]>([entry('a'), entry('b'), entry('c')])
    const current = ref<VideoSelectDetail | null>(entry('b') as VideoSelectDetail)
    const { hasNext, hasPrevious, nextEntry, previousEntry } = usePlaylist(playlist, current)

    expect(hasNext.value).toBe(true)
    expect(hasPrevious.value).toBe(true)
    expect(nextEntry.value).toEqual(entry('c'))
    expect(previousEntry.value).toEqual(entry('a'))
  })

  it('has no previous at the start of the playlist and no next at the end', () => {
    const playlist = ref<VideoEntry[]>([entry('a'), entry('b')])

    const atStart = ref<VideoSelectDetail | null>(entry('a') as VideoSelectDetail)
    const start = usePlaylist(playlist, atStart)
    expect(start.hasPrevious.value).toBe(false)
    expect(start.hasNext.value).toBe(true)

    const atEnd = ref<VideoSelectDetail | null>(entry('b') as VideoSelectDetail)
    const end = usePlaylist(playlist, atEnd)
    expect(end.hasPrevious.value).toBe(true)
    expect(end.hasNext.value).toBe(false)
  })

  it('updates reactively as the current video changes (e.g. from an external video-select)', () => {
    const playlist = ref<VideoEntry[]>([entry('a'), entry('b'), entry('c')])
    const current = ref<VideoSelectDetail | null>(entry('a') as VideoSelectDetail)
    const { hasNext, nextEntry } = usePlaylist(playlist, current)

    expect(nextEntry.value).toEqual(entry('b'))

    current.value = entry('c') as VideoSelectDetail
    expect(hasNext.value).toBe(false)
    expect(nextEntry.value).toBeNull()
  })
})
