/**
 * CSS's `light-dark(light, dark)`, as editors read and write it. Widgets set `color-scheme` on
 * their root, so a value written this way picks its half by the widget's scheme, in any property.
 */

/** Splits on commas that aren't inside parentheses: `var(--a, red), blue` → two parts. */
function splitTopLevel(text) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(text.slice(start).trim())
  return parts
}

/** `[light, dark]` from `light-dark(light, dark)`, or undefined for any other value. */
export function parseLightDark(value) {
  const match = value?.trim().match(/^light-dark\((.*)\)$/s)
  if (!match) return undefined
  const parts = splitTopLevel(match[1])
  return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : undefined
}

export const lightDark = (light, dark) => `light-dark(${light}, ${dark})`
