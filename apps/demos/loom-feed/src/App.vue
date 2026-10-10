<script setup>
import { computed, onScopeDispose, ref } from 'vue'
import { useColorMode, useDropZone } from '@vueuse/core'
import { useToast } from '@nuxt/ui/composables'
import { provideKit, Widget } from '@munsonlabs/loom'
import { useBridge } from 'bolt-bridge-stub'
import { feedOf, timelineKit as kit } from 'timeline-kit'
import { messages, native, onNativeCall } from './native'
import { useLibrary } from './useLibrary'

const { library, source, error, importLibrary, loadBundled } = useLibrary()
const toast = useToast()

// The Bolt bridge is the widgets' context, so every source can reach the native app.
const bridge = useBridge()
provideKit(kit, bridge)
/** The stories the app sent, minus the ones that only appear inside another. */
const feed = computed(() => feedOf(bridge.stories))

// What the native app would show on screen, as toasts.
const say = (title, icon) => toast.add({ title, icon, duration: 2000 })
onScopeDispose(
  onNativeCall((name, payload) => {
    const story = payload.story
    if (name === 'viewArticle') say(`The app opens “${story?.entry.title}”`, 'i-lucide-book-open')
    if (name === 'shareStory') say(`The app shares “${story?.entry.title}”`, 'i-lucide-share')
    if (name === 'fireToast' && payload.key === 'content_save') say('Saved for later', 'i-lucide-bookmark')
    if (name === 'showPaywall') paywalled.value = payload[0]
  }),
)

// The native app's paywall screen, standing in for the real one. Subscribing happens in the app,
// which tells the bridge, which unlocks every paywalled story.
const paywalled = ref()
const subscribed = computed(() => bridge.authorisationStatus.state === 'active')
function subscribe() {
  native.setSubscribed(true)
  paywalled.value = undefined
}
const bridgeOpen = ref(false)

// Widgets follow the page's light or dark mode.
const mode = useColorMode()
const scheme = computed(() => (mode.state.value === 'dark' ? 'dark' : 'light'))

const width = ref('tablet')
const maxWidth = { phone: 'max-w-[390px]', tablet: 'max-w-[640px]', wide: 'max-w-6xl' }

async function load(input, name) {
  if (await importLibrary(input, name)) {
    toast.add({ title: `Loaded ${library.value.widgets.length} widgets from ${source.value.name}`, icon: 'i-lucide-library', duration: 2500 })
  }
}

const picker = ref()
function picked(event) {
  const file = event.target.files?.[0]
  if (file) void load(file)
  event.target.value = ''
}

const pasteOpen = ref(false)
const pasted = ref('')
async function paste() {
  await load(pasted.value)
  if (!error.value) {
    pasteOpen.value = false
    pasted.value = ''
  }
}

const page = ref()
const { isOverDropZone } = useDropZone(page, {
  dataTypes: ['application/json'],
  onDrop: (files) => files?.[0] && void load(files[0]),
})

const published = computed(() => {
  const at = library.value?.publishedAt
  return at ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : undefined
})
</script>

<template>
  <UApp>
    <div ref="page" class="min-h-dvh bg-muted">
      <header class="sticky top-0 z-10 border-b border-default bg-default/90 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <UIcon name="i-lucide-newspaper" class="size-5 text-primary" />
          <h1 class="font-semibold">Timeline</h1>
          <span class="hidden text-sm text-muted sm:inline">A feed that knows its kit, a library file and the Bolt bridge.</span>
          <div class="ml-auto flex items-center gap-2">
            <UTabs
              v-model="width"
              :items="[
                { value: 'phone', icon: 'i-lucide-smartphone' },
                { value: 'tablet', icon: 'i-lucide-tablet' },
                { value: 'wide', icon: 'i-lucide-monitor' },
              ]"
              :content="false"
              size="xs"
              aria-label="Width"
            />
            <UButton
              label="Bridge"
              icon="i-lucide-arrow-left-right"
              size="sm"
              color="neutral"
              :variant="bridgeOpen ? 'soft' : 'ghost'"
              @click="bridgeOpen = !bridgeOpen"
            />
            <UColorModeButton />
          </div>
        </div>

        <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-3 text-sm">
          <UBadge :label="source?.name ?? 'Loading…'" icon="i-lucide-file-json" color="neutral" variant="subtle" />
          <template v-if="library">
            <span class="text-muted">
              {{ library.widgets.length }} widgets<template v-if="published">, published {{ published }}</template>
            </span>
            <UBadge v-if="source?.imported" label="Imported" color="primary" variant="subtle" size="sm" />
          </template>
          <div class="ml-auto flex gap-2">
            <UButton label="Import" icon="i-lucide-upload" size="sm" @click="picker?.click()" />
            <UButton label="Paste" icon="i-lucide-clipboard" size="sm" color="neutral" variant="outline" @click="pasteOpen = true" />
            <UButton
              v-if="source?.imported"
              label="Use the bundled library"
              icon="i-lucide-rotate-ccw"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="loadBundled"
            />
          </div>
          <input ref="picker" type="file" accept="application/json,.json" class="hidden" @change="picked" />
        </div>
      </header>

      <main class="mx-auto flex flex-col gap-4 px-4 py-6" :class="maxWidth[width]">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-x"
          title="That isn’t a library this app can read"
          :description="error"
        />
        <UAlert
          v-if="library?.kitMismatch"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="`Made for the “${library.kitMismatch.actual}” kit, not “${library.kitMismatch.expected}”`"
          description="Widgets that need what this app doesn't have are skipped below."
        />
        <UAlert
          v-if="library?.skipped.length"
          color="warning"
          variant="subtle"
          icon="i-lucide-eye-off"
          :title="`Skipped ${library.skipped.length} widget${library.skipped.length === 1 ? '' : 's'} this app can’t render`"
        >
          <template #description>
            <ul class="mt-1 flex flex-col gap-0.5">
              <li v-for="s in library.skipped" :key="s.id">
                <strong>{{ s.name ?? s.id }}</strong
                >: {{ s.issues.map((i) => i.message).join('; ') }}
              </li>
            </ul>
          </template>
        </UAlert>

        <div v-if="library" :class="width === 'wide' ? 'columns-1 gap-4 md:columns-2 lg:columns-3' : 'flex flex-col gap-4'">
          <div
            v-for="(story, i) in feed"
            :key="story.entry.id"
            :class="width === 'wide' && 'mb-4 break-inside-avoid'"
            class="overflow-hidden rounded-xl shadow-xs ring ring-default"
          >
            <Widget :definitions="library.widgets" :data="story" :index="i" :scheme="scheme">
              <template #fallback>
                <p class="bg-default p-4 text-xs text-dimmed">
                  No widget for “{{ kit.describe(story) }}”{{ story.entry.type ? ` (${story.entry.type})` : ', which has no type' }}.
                </p>
              </template>
            </Widget>
          </div>
        </div>
      </main>

      <div
        v-if="isOverDropZone"
        class="pointer-events-none fixed inset-4 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 text-lg font-medium text-primary"
      >
        Drop a library to render it
      </div>
    </div>

    <aside
      v-if="bridgeOpen"
      class="fixed bottom-4 left-4 z-20 flex max-h-[60dvh] w-96 flex-col overflow-hidden rounded-xl bg-default shadow-lg ring ring-default"
    >
      <div class="flex items-center gap-2 border-b border-default px-3 py-2">
        <span class="text-sm font-medium">Bridge</span>
        <span class="text-xs text-muted">the web asks, the app pings back, the web reads</span>
        <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" class="ml-auto" aria-label="Close" @click="bridgeOpen = false" />
      </div>
      <label class="flex items-center gap-2 border-b border-default px-3 py-2 text-xs">
        <USwitch :model-value="subscribed" size="xs" @update:model-value="native.setSubscribed(!!$event)" />
        <span>Subscriber in the app</span>
        <span class="text-muted">— paywalled stories {{ subscribed ? 'unlocked' : 'locked' }}</span>
      </label>
      <ol class="flex flex-col overflow-auto p-2 font-mono text-xs">
        <li v-if="!messages.length" class="p-2 text-muted">Tap Save, Play, Follow or a card.</li>
        <li v-for="m in messages" :key="m.id" class="flex gap-2 rounded px-2 py-1" :class="m.direction === 'to-web' && 'text-primary'">
          <span class="shrink-0">{{ m.direction === 'to-app' ? 'web → app' : 'app → web' }}</span>
          <span class="min-w-0">
            <strong>{{ m.name }}</strong>
            <span v-if="m.detail" class="text-muted"> {{ m.detail }}</span>
          </span>
        </li>
      </ol>
    </aside>

    <UModal
      :open="!!paywalled"
      title="Subscribe to keep reading"
      :description="`“${paywalled?.entry.title}” is for subscribers. (The native app's paywall, shown through bridge.call('showPaywall').)`"
      @update:open="!$event && (paywalled = undefined)"
    >
      <template #body>
        <div class="flex flex-col items-center gap-3 py-2 text-center">
          <UIcon name="i-lucide-lock" class="size-8 text-primary" />
          <p class="text-sm text-muted">Unlimited access to every story, podcast and live blog.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Not now" color="neutral" variant="ghost" @click="paywalled = undefined" />
          <UButton label="Subscribe" icon="i-lucide-sparkles" @click="subscribe" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="pasteOpen" title="Paste a library" description="A library's JSON, the whole file or a list of widgets.">
      <template #body>
        <UTextarea v-model="pasted" :rows="12" autoresize class="w-full font-mono text-xs" placeholder='{ "format": "loom-library", … }' />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="pasteOpen = false" />
          <UButton label="Render it" icon="i-lucide-play" :disabled="!pasted.trim()" @click="paste" />
        </div>
      </template>
    </UModal>
  </UApp>
</template>
