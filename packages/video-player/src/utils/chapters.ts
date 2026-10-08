import type { ChapterInfo } from '@/types/playback'

/**
 * Finds the chapter a time falls in, if any.
 */
export function findChapter(chapters: ChapterInfo[], time: number): ChapterInfo | undefined {
  return chapters.find((chapter) => time >= chapter.start && time < chapter.end)
}
