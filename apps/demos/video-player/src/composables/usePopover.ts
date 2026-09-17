import { computed, ref } from 'vue'

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
