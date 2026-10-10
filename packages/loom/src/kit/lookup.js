/** Finding things in a kit: a block's defaults. */

/**
 * @param {Kit} kit
 * @param {string} type
 * @returns {Record<string, unknown>}
 */
export function blockDefaults(kit, type) {
  return Object.fromEntries(Object.entries(kit.blocks[type]?.props ?? {}).map(([name, spec]) => [name, spec.default]))
}
