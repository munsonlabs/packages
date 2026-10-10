/** @typedef {{ kind: 'library'; data: unknown } | { kind: 'widget'; definition: WidgetDefinition }} Imported */

/**
 * What pasted JSON is. A library, or a bare list of widgets, goes to the app. A single widget
 * replaces the one being edited, and keeps that widget's id: the app stores it in its library
 * under that id, so a pasted file mustn't quietly turn it into another widget.
 */
export function parseImport(text, currentId) {
  const parsed = JSON.parse(text)
  if (Array.isArray(parsed) || parsed?.format === 'loom-library') return { kind: 'library', data: parsed }
  if (!parsed?.root?.id) throw new Error('Not a widget definition or a library: it needs a `root`, or `widgets`.')
  return { kind: 'widget', definition: { ...parsed, id: currentId } }
}
