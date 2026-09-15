import { computed, ref } from 'vue'

// Module-scoped so opening one popover (Events, Settings, ...) closes any other that's open.
const activeId = ref<string | null>(null)

export function usePopover(id: string) {
  const isOpen = computed(() => activeId.value === id)
  function toggle(): void {
    activeId.value = activeId.value === id ? null : id
  }
  function close(): void {
    if (activeId.value === id) activeId.value = null
  }
  return { isOpen, toggle, close }
}
