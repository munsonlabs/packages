<script setup lang="ts">
import type { Component } from 'vue'
import type { CustomAction, PlayerHandle } from '@munsonlabs/video-player'
import type { ReelPickerElement } from '@munsonlabs/reel/element'

// The docs' own files: the sample from public/media/reel/, the brand mark as the clip's logo.
const base = useRuntimeConfig().app.baseURL
const flowerUrl = `${base}media/reel/flower.mp4`
const logoUrl = `${base}brand/marks/reel.svg`

const scissors =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>'

const Player = shallowRef<Component | null>(null)
const player = useTemplateRef<PlayerHandle>('player')
const picker = useTemplateRef<ReelPickerElement>('picker')
const action = shallowRef<CustomAction | null>(null)
const failed = ref('')
/** The last export: the file, its deep link and the ready-to-post caption, read off the picker. */
const clip = shallowRef<{ blob: Blob; link: string; caption: string } | null>(null)
const shared = ref('')

onMounted(async () => {
  try {
    const [playerModule, { canClip }] = await Promise.all([
      import('@munsonlabs/video-player'),
      import('@munsonlabs/reel'),
      import('@munsonlabs/video-player/style'),
      import('@munsonlabs/reel/element').then(({ setPickerDefaults }) => {
        // The sample is five seconds long, so a shorter range gives both handles room; the brand mark is
        // stamped on the clip and heads the end card.
        setPickerDefaults({ length: 2.5, logo: logoUrl, displayUrl: 'munsonlabs.com/reel' })
      }),
    ])
    Player.value = playerModule.VideoPlayer as Component
    const check = await canClip(flowerUrl)
    if (check.ok) action.value = { icon: scissors, label: 'Clip this', onClick: open }
    else failed.value = check.message
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error)
  }
})

/** The picker clips the page's player: hand it the handle, then open it on the moment. */
function open(): void {
  const handle = player.value
  const el = picker.value
  if (!handle || !el) return
  Object.assign(el, {
    player: handle,
    source: new URL(flowerUrl, location.href).href,
    // The page itself, so the clip's #ml-t= link reopens this player at the moment.
    origin: { url: location.href.split('#')[0], title: 'A flower opens', publisher: 'Munson Labs docs', player: 'flower' },
  })
  el.show()
}

/** `reel-export` carries the file and the link; `shareCaption` on the element is the caption the picker would copy. */
function onExport(event: Event): void {
  const { blob, link } = (event as CustomEvent<{ blob: Blob; link: string | null }>).detail
  clip.value = { blob, link: link ?? '', caption: picker.value?.shareCaption ?? '' }
  shared.value = ''
}

/** The page's own share: the clip as a file with the caption as its text, or a download where files cannot be shared. */
async function share(): Promise<void> {
  const done = clip.value
  if (!done) return
  const file = new File([done.blob], 'a-flower-opens.mp4', { type: done.blob.type })
  const data: ShareData = { files: [file], text: done.caption, url: done.link || undefined }
  if (typeof navigator.share === 'function' && navigator.canShare?.(data)) {
    try {
      await navigator.share(data)
      shared.value = 'Shared with the caption as its text.'
    } catch {
      shared.value = 'Share sheet dismissed.'
    }
    return
  }
  const url = URL.createObjectURL(done.blob)
  Object.assign(document.createElement('a'), { href: url, download: file.name }).click()
  URL.revokeObjectURL(url)
  shared.value = 'This browser cannot share files, so the clip was downloaded instead.'
}
</script>

<template>
  <figure class="reel-example">
    <ClientOnly>
      <div class="reel-example__stage">
        <component
          :is="Player"
          v-if="Player"
          ref="player"
          :src="flowerUrl"
          :action="action"
          label="A flower opens"
          deep-link="flower"
          deep-link-end="loop"
        />
        <p v-else class="reel-example__note">Loading player…</p>
        <ml-reel-picker ref="picker" @reel-export="onExport" />
        <div class="reel-example__actions">
          <UButton icon="i-lucide-scissors" :disabled="!action" @click="open">Clip this</UButton>
          <UButton v-if="clip" icon="i-lucide-share" variant="outline" @click="share">Share from the page</UButton>
          <span v-if="failed" class="reel-example__note">Clipping is not available here: {{ failed }}</span>
          <span v-else-if="!clip" class="reel-example__note">Press the scissors in the player. The core loads when the picker opens.</span>
        </div>
        <div v-if="clip" class="reel-example__result">
          <p class="reel-example__note">
            Deep link:
            <a :href="clip.link"
              ><code>{{ clip.link }}</code></a
            >
          </p>
          <pre class="reel-example__caption">{{ clip.caption }}</pre>
          <p v-if="shared" class="reel-example__note">{{ shared }}</p>
        </div>
      </div>
      <template #fallback>
        <p class="reel-example__note">Loading…</p>
      </template>
    </ClientOnly>
  </figure>
</template>

<style scoped>
.reel-example {
  margin: 1.5rem 0;
}

.reel-example__stage,
.reel-example__result {
  display: grid;
  gap: 12px;
}

.reel-example__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.reel-example__note {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.reel-example__caption {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
  background: var(--ui-bg-elevated);
  font-size: 0.875rem;
  white-space: pre-wrap;
}
</style>
