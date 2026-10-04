<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PickerLabels } from '@/registries/pickerDefaults'
import type { ReelCopyDetail, ReelExportDetail, ShareResult } from '@/ui/picker/types'

const props = defineProps<{
  result: ReelExportDetail
  filename: string
  getCaption: () => string
  title?: string
  warning: string
  labels: PickerLabels
}>()

const emit = defineEmits<{
  share: [detail: ReelExportDetail]
  download: [detail: ReelExportDetail]
  copy: [detail: ReelCopyDetail]
  again: []
}>()

const url = URL.createObjectURL(props.result.blob)
onBeforeUnmount(() => URL.revokeObjectURL(url))

const shareButton = ref<HTMLButtonElement | null>(null)
const link = ref<HTMLAnchorElement | null>(null)
const field = ref<HTMLTextAreaElement | null>(null)
const copyStatus = ref('')
const caption = ref('')
const fallback = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => shareButton.value?.focus())
onBeforeUnmount(() => clearTimeout(copiedTimer))

/**
 * Web Share with the file, the deep link and the caption as `text`; where files cannot be shared (most
 * desktop browsers) or sharing fails, downloads instead.
 */
async function share(): Promise<ShareResult> {
  const file = new File([props.result.blob], props.filename, { type: props.result.blob.type })
  const data: ShareData = { files: [file], title: props.title, text: props.getCaption() || undefined, url: props.result.link ?? undefined }
  if (typeof navigator.share === 'function' && navigator.canShare?.(data)) {
    try {
      await navigator.share(data)
      emit('share', props.result)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed'
    }
  }
  download()
  return 'downloaded'
}

function download(): void {
  emit('download', props.result)
  link.value?.click()
}

function onLinkClick(event: MouseEvent): void {
  if (event.isTrusted) emit('download', props.result)
}

/**
 * Where the clipboard is refused (no permission, insecure context, old browser) the caption goes into a
 * read-only field, selected, ready to copy by hand.
 */
async function copyCaption(): Promise<ReelCopyDetail['result']> {
  const text = props.getCaption()
  caption.value = text
  clearTimeout(copiedTimer)
  let result: ReelCopyDetail['result']
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard')
    await navigator.clipboard.writeText(text)
    fallback.value = false
    copyStatus.value = props.labels.copied
    // Cleared after a while, so copying again is announced again.
    copiedTimer = setTimeout(() => (copyStatus.value = ''), 4000)
    result = 'copied'
  } catch {
    fallback.value = true
    copyStatus.value = props.labels.copyFallback
    await nextTick()
    field.value?.focus()
    field.value?.select()
    result = 'selected'
  }
  emit('copy', { text, result })
  return result
}

defineExpose({ share, download, copyCaption })
</script>

<template>
  <div class="reel-result">
    <video :src="url" controls playsinline />
    <div class="reel-side">
      <p class="reel-status" role="status">{{ labels.done }}</p>
      <p v-if="warning" class="reel-status reel-warning" data-kind="error">{{ warning }}</p>
      <div class="reel-actions">
        <button ref="shareButton" type="button" class="reel-button reel-button--primary reel-share" @click="share">{{ labels.share }}</button>
        <a ref="link" class="reel-button reel-download" :href="url" :download="filename" @click="onLinkClick">{{ labels.download }}</a>
        <button type="button" class="reel-button reel-copy" @click="copyCaption">{{ labels.copyCaption }}</button>
        <button type="button" class="reel-button reel-again" @click="emit('again')">{{ labels.again }}</button>
      </div>
      <p class="reel-status reel-copy-status" role="status" aria-live="polite">{{ copyStatus }}</p>
      <textarea v-if="fallback" ref="field" class="reel-caption-text" :aria-label="labels.captionField" :value="caption" readonly rows="4" />
    </div>
  </div>
</template>

<style scoped>
.reel-result video {
  width: 100%;
  border-radius: calc(var(--_radius) / 1.4);
  background: #000;
}

.reel-caption-text {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--_muted);
  border-radius: calc(var(--_radius) / 1.6);
  background: var(--_surface);
  color: var(--_fg);
  font: inherit;
  font-size: 0.9rem;
  resize: vertical;
}
</style>
