export function fmtTime(s: number, round = false): string {
  if (!s || isNaN(s)) return '0:00'
  const total = round ? Math.round(s) : Math.floor(s)
  const m = Math.floor(total / 60)
  const sec = String(total % 60).padStart(2, '0')
  return `${m}:${sec}`
}
