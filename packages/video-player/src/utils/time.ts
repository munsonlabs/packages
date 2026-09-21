/**
 * Clock-formats a duration in seconds. Stays at `m:ss` below an hour and widens to `h:mm:ss` at or
 * above one, so a long video reads as `1:20:05` rather than `80:05`. Minutes are zero-padded only
 * once an hours part is present, which is the convention every player UI follows.
 */
export function fmtTime(s: number, round = false): string {
  if (!s || isNaN(s) || s < 0) return '0:00'
  const total = round ? Math.round(s) : Math.floor(s)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  if (!hours) return `${minutes}:${seconds}`
  return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
}
