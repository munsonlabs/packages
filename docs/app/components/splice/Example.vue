<script setup lang="ts">
import type { Component } from 'vue'
import type { CustomAction, PlayerHandle } from '@munsonlabs/video-player'
import type { EditorErrorDetail, EditorExportDetail } from '@munsonlabs/splice/vue'

// The docs' own files: the clock from public/media/splice/, HLS with English captions on by default,
// and the splice mark as the clip's logo, stamped in a corner and heading the end card.
const base = useRuntimeConfig().app.baseURL
const clockUrl = `${base}media/splice/clock/master.m3u8`
const logoUrl = `${base}brand/marks/splice.svg`
const stamp = { logo: logoUrl }
const endCard = { logo: logoUrl, displayUrl: 'munsonlabs.pages.dev/splice' }

const scissors =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>'

const Player = shallowRef<Component | null>(null)
const Editor = shallowRef<Component | null>(null)
const player = useTemplateRef<PlayerHandle>('player')
const action = shallowRef<CustomAction | null>(null)
const open = ref(false)
const failed = ref('')
const note = ref('')
const link = ref('')

// The page itself, so the clip's #ml-t= link reopens this player at the moment.
const origin = computed(() => ({
  url: location.href.split('#')[0],
  title: 'The clock that never stops',
  publisher: 'Munson Labs docs',
  player: 'clock',
}))

onMounted(async () => {
  const loading = Promise.all([
    import('@munsonlabs/video-player'),
    import('@munsonlabs/splice/vue'),
    import('@munsonlabs/splice'),
    import('@munsonlabs/video-player/style'),
    import('@munsonlabs/splice/style'),
  ])
  const loaded = await loading.catch((error: unknown) => {
    failed.value = error instanceof Error ? error.message : String(error)
    return null
  })
  if (!loaded) return

  const [playerModule, editorModule, { canSplice }] = loaded
  Player.value = playerModule.VideoPlayer as Component
  Editor.value = editorModule.SpliceEditor as Component

  const check = await canSplice(clockUrl, { crop: { aspect: '9:16' } })
  if (check.ok) action.value = { icon: scissors, label: 'Clip this', onClick: () => (open.value = true) }
  else failed.value = check.message
})

function onExport(detail: EditorExportDetail): void {
  link.value = detail.link ?? ''
  note.value = ''
}

function onError(detail: EditorErrorDetail): void {
  note.value = detail.message
}
</script>

<template>
  <figure class="splice-example">
    <ClientOnly>
      <div class="splice-example__stage">
        <component
          :is="Player"
          v-if="Player"
          ref="player"
          :src="clockUrl"
          :action="action"
          label="The clock that never stops"
          deep-link="clock"
          deep-link-end="loop"
        />
        <p v-else class="splice-example__note">Loading player…</p>
        <component
          :is="Editor"
          v-if="Editor"
          v-model:open="open"
          :player="player"
          :source="clockUrl"
          :origin="origin"
          :stamp="stamp"
          :end-card="endCard"
          @export="onExport"
          @error="onError"
        />
        <div class="splice-example__actions">
          <UButton icon="i-lucide-scissors" :disabled="!action || open" @click="open = true">Clip this</UButton>
          <span v-if="failed" class="splice-example__note">Splicing is not available here: {{ failed }}</span>
          <span v-else-if="note" class="splice-example__note">{{ note }}</span>
          <span v-else-if="!link" class="splice-example__note">Press the scissors in the player. The core loads when the editor opens.</span>
        </div>
        <p v-if="link" class="splice-example__note">
          Deep link:
          <a :href="link"
            ><code>{{ link }}</code></a
          >
        </p>
      </div>
      <template #fallback>
        <p class="splice-example__note">Loading…</p>
      </template>
    </ClientOnly>
  </figure>
</template>

<style scoped>
.splice-example {
  margin: 1.5rem 0;
}

.splice-example__stage {
  display: grid;
  gap: 12px;
}

.splice-example__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.splice-example__note {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
</style>
