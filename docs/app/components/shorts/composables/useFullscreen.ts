import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export function useFullscreen(target: Ref<HTMLElement | null>) {
  const isFullscreen = ref(false)

  function sync(): void {
    isFullscreen.value = document.fullscreenElement === target.value
  }

  function toggle(): void {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void target.value?.requestFullscreen()
  }

  onMounted(() => document.addEventListener('fullscreenchange', sync))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', sync))

  return { isFullscreen, toggle }
}
