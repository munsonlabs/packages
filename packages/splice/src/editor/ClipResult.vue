<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { EditorExportDetail, EditorLabels } from '@/types/editor'

const props = defineProps<{
  result: EditorExportDetail
  title?: string
  warning: string
  labels: EditorLabels
}>()

const emit = defineEmits<{ again: [] }>()

const url = URL.createObjectURL(props.result.blob)
const shareButton = ref<HTMLButtonElement | null>(null)
const downloadLink = ref<HTMLAnchorElement | null>(null)
const copyStatus = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const filename = computed(() => {
  const { start, end } = props.result
  const slug = (props.title ?? 'clip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${slug || 'clip'}-${Math.round(start)}-${Math.round(end)}.mp4`
})

/**
 * Shares the clip and its link with the Web Share API. Most desktop browsers can't share files, so
 * it downloads instead, and cancelling the share sheet does nothing.
 */
async function share(): Promise<void> {
  const file = new File([props.result.blob], filename.value, { type: props.result.blob.type })
  const data: ShareData = { files: [file], title: props.title, url: props.result.link ?? undefined }
  const canShare = typeof navigator.share === 'function' && navigator.canShare?.(data)

  const shared = canShare
    ? await navigator.share(data).then(
        () => 'shared' as const,
        (error: unknown) => error,
      )
    : null
  const isDismissed = shared instanceof DOMException && shared.name === 'AbortError'
  if (shared !== 'shared' && !isDismissed) downloadLink.value?.click()
}

/**
 * Copies the link back to the moment and says so for a few seconds.
 */
async function copyLink(): Promise<void> {
  const link = props.result.link ?? ''
  const copied = await navigator.clipboard
    ?.writeText(link)
    .then(() => true)
    .catch(() => false)

  clearTimeout(copiedTimer)
  copyStatus.value = copied ? props.labels.copied : props.labels.copyFailed
  copiedTimer = setTimeout(() => (copyStatus.value = ''), 4000)
}

onMounted(() => shareButton.value?.focus())
onBeforeUnmount(() => {
  URL.revokeObjectURL(url)
  clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="splice-result">
    <video :src="url" controls playsinline />
    <div class="splice-side">
      <p class="splice-status" role="status">{{ labels.done }}</p>
      <p v-if="warning" class="splice-status splice-warning" data-kind="error">{{ warning }}</p>
      <div class="splice-actions">
        <button ref="shareButton" type="button" class="splice-button splice-button--primary splice-share" @click="share">{{ labels.share }}</button>
        <a ref="downloadLink" class="splice-button splice-download" :href="url" :download="filename">{{ labels.download }}</a>
        <button v-if="result.link" type="button" class="splice-button splice-copy" @click="copyLink">{{ labels.copyLink }}</button>
        <button type="button" class="splice-button splice-again" @click="emit('again')">{{ labels.again }}</button>
      </div>
      <p class="splice-status splice-copy-status" role="status" aria-live="polite">{{ copyStatus }}</p>
    </div>
  </div>
</template>

<style scoped>
.splice-result video {
  width: 100%;
  border-radius: calc(var(--_radius) / 1.4);
  background: #000;
}
</style>
