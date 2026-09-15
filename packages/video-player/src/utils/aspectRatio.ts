export function parseAspectRatio(ar: string): { isPortrait: boolean; cssRatio: string } {
  const [w, h] = ar.split(':').map(Number)
  return { isPortrait: h > w, cssRatio: `${w}/${h}` }
}
