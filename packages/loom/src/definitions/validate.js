export function parseAction(binding) {
  return typeof binding === 'string' ? { action: binding } : binding
}
