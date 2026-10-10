/** Finding things in a kit: a theme, and a block's defaults. */

/**
 * A kit's theme by id, or its default (first) theme.
 *
 * @param {Kit} kit
 * @param {string} [id]
 * @returns {Theme}
 */
export function getTheme(kit, id) {
  return (id && kit.themes.find((t) => t.id === id)) || kit.themes[0]
}

/**
 * @param {Kit} kit
 * @param {string} type
 * @returns {Record<string, unknown>}
 */
export function blockDefaults(kit, type) {
  return Object.fromEntries(Object.entries(kit.blocks[type]?.props ?? {}).map(([name, spec]) => [name, spec.default]))
}
