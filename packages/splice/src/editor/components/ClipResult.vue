<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Sigil } from '@munsonlabs/sigil/vue'
import { useLabels } from '../composables'
import { formatShareCaption } from '../utils'
import type { EditorExportDetail, ShareCaption } from '@/types/editor'
import type { SpliceOrigin } from '@/types/splice'

const props = defineProps<{
  result: EditorExportDetail
  origin?: SpliceOrigin
  shareCaption: ShareCaption
  warning: string
}>()

const emit = defineEmits<{ again: [] }>()

const labels = useLabels()
const url = URL.createObjectURL(props.result.blob)
const title = computed(() => props.origin?.title)

const caption = computed(() => {
  const { title = '', publisher = '' } = props.origin ?? {}
  const { start, end, link } = props.result
  return formatShareCaption(props.shareCaption, { title, publisher, url: link ?? '', start, end })
})
const shareButton = ref<HTMLButtonElement | null>(null)
const downloadLink = ref<HTMLAnchorElement | null>(null)
const copyStatus = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const filename = computed(() => {
  const { start, end } = props.result
  const slug = (title.value ?? 'clip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${slug || 'clip'}-${Math.round(start)}-${Math.round(end)}.mp4`
})

/**
 * Shares the clip and its caption with the Web Share API. Most desktop browsers can't share files,
 * so it downloads instead, and cancelling the share sheet does nothing. Lots of apps throw away the
 * text that comes with a file, so the caption goes on the clipboard too. That has to happen before
 * the sheet opens or the browser won't allow it.
 */
async function share(): Promise<void> {
  const file = new File([props.result.blob], filename.value, { type: props.result.blob.type })
  const data: ShareData = { files: [file], title: title.value, text: caption.value || undefined }
  const canShare = typeof navigator.share === 'function' && navigator.canShare?.(data)
  const copying = caption.value ? writeCaption() : Promise.resolve(false)

  const shared = canShare
    ? await navigator.share(data).then(
        () => 'shared' as const,
        (error: unknown) => error,
      )
    : null
  const isDismissed = shared instanceof DOMException && shared.name === 'AbortError'
  if (shared !== 'shared' && !isDismissed) downloadLink.value?.click()
  if (!isDismissed && (await copying)) announce(labels.value.captionCopied)
}

/**
 * Copies the caption and its link, and says so for a few seconds.
 */
async function copyCaption(): Promise<void> {
  const copied = await writeCaption()
  announce(copied ? labels.value.copied : labels.value.copyFailed)
}

/**
 * Puts the caption on the clipboard. Returns false if there's no clipboard or we're not allowed to
 * use it.
 */
function writeCaption(): Promise<boolean> {
  const write = navigator.clipboard?.writeText(caption.value)
  return write ? write.then(() => true).catch(() => false) : Promise.resolve(false)
}

function announce(message: string): void {
  clearTimeout(copiedTimer)
  copyStatus.value = message
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
        <button ref="shareButton" type="button" class="splice-button splice-button--primary splice-share" @click="share">
          <Sigil name="share" library="splice" class="splice-icon" /><span>{{ labels.share }}</span>
        </button>
        <a ref="downloadLink" class="splice-button splice-download" :href="url" :download="filename">
          <Sigil name="download" library="splice" class="splice-icon" /><span>{{ labels.download }}</span>
        </a>
        <button v-if="caption" type="button" class="splice-button splice-copy" @click="copyCaption">
          <Sigil name="copy" library="splice" class="splice-icon" /><span>{{ labels.copyCaption }}</span>
        </button>
        <button type="button" class="splice-button splice-again" @click="emit('again')">
          <Sigil name="again" library="splice" class="splice-icon" /><span>{{ labels.again }}</span>
        </button>
      </div>
      <p class="splice-status splice-copy-status" role="status" aria-live="polite">{{ copyStatus }}</p>
    </div>
  </div>
</template>

<style scoped>
.splice-result {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
}

.splice-result video {
  height: min(320px, 50dvh);
  max-width: 100%;
  border-radius: calc(var(--_radius) / 1.4);
  background: #000;
}

.splice-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.splice-side {
  display: grid;
  gap: 10px;
}

@media (max-width: 480px) {
  .splice-result {
    grid-template-columns: 1fr;
  }
}
</style>
