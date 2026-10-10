<script setup>
import { computed, ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { createLibrary, hasErrors, validateDefinition } from '@munsonlabs/loom'
import { useStudio } from '../studio'

/** Export: this widget's JSON, the whole library as one file (when the app passes `library`), and how to use it. */
const s = useStudio()
const toast = useToast()

const json = computed(() => JSON.stringify(s.definition, null, 2))
const libraryFile = computed(() => `${s.props.kit.id ?? 'widgets'}.library.json`)
/** The whole library as one file, for the app to fetch. Dated when it's made. */
const libraryJson = () => JSON.stringify(createLibrary(s.props.kit, s.props.library ?? [], { publishedAt: new Date() }), null, 2)
/** What a published library would need, and which widgets wouldn't render as written. */
const librarySummary = computed(() => {
  const library = createLibrary(s.props.kit, s.props.library ?? [])
  const broken = (s.props.library ?? []).filter((d) => hasErrors(validateDefinition(s.props.kit, d))).map((d) => d.name)
  return { ...library, broken }
})

const usage = computed(
  () =>
    `<script setup>
import { Widget, provideKit, loadLibrary } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
import { kit } from './kit' // your sources, blocks and kinds

provideKit(kit, context) // context: what your sources need, e.g. a bridge or a cart

// The whole library, fetched at runtime: widgets this app can't render are skipped and reported.
const { widgets, skipped, missing } = loadLibrary(kit, await (await fetch('/${libraryFile.value}')).json())
</` +
    `script>

<template>
  <!-- Each item gets the widget for its kind, then the variant its rules pick. -->
  <Widget v-for="(item, i) in items" :key="item.id" :definitions="widgets" :data="item" :index="i" />
</template>`,
)

const tab = ref('widget')
const tabs = computed(() => [
  { label: 'This widget', value: 'widget', slot: 'widget' },
  ...(s.props.library ? [{ label: `Whole library (${s.props.library.length})`, value: 'library', slot: 'library' }] : []),
  { label: 'Usage', value: 'usage', slot: 'usage' },
])

function exported() {
  return tab.value === 'library' ? { text: libraryJson(), file: libraryFile.value } : { text: json.value, file: `${s.definition.id}.widget.json` }
}

async function copy() {
  await navigator.clipboard.writeText(exported().text)
  toast.add({ title: 'Copied', icon: 'i-lucide-check', duration: 1500 })
}

function download() {
  const { text, file } = exported()
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  Object.assign(document.createElement('a'), { href: url, download: file }).click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <UModal
    v-model:open="s.open.export"
    title="Export"
    description="A widget is plain JSON. Apps load the whole library: every widget for this kit, in one file, in order."
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <UTabs v-model="tab" :items="tabs" variant="link" size="sm">
        <template #widget>
          <pre class="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">{{ json }}</pre>
        </template>
        <template #library>
          <div class="flex flex-col gap-3 text-sm">
            <p class="text-muted">
              <strong class="text-default">{{ libraryFile }}</strong
              >: {{ librarySummary.widgets.length }} widgets, in the order apps try them. The first whose kind matches an item renders it.
            </p>
            <ol class="flex flex-col gap-1 rounded-md bg-muted p-3 text-xs">
              <li v-for="(w, i) in librarySummary.widgets" :key="w.id" class="flex items-center gap-2">
                <span class="w-4 text-dimmed">{{ i + 1 }}</span>
                <span class="font-medium">{{ w.name }}</span>
                <code class="text-dimmed">{{ w.id }}</code>
                <UBadge v-if="w.kind" :label="w.kind" size="sm" color="neutral" variant="subtle" />
                <UBadge v-if="librarySummary.broken.includes(w.name)" label="has errors" size="sm" color="error" variant="subtle" class="ml-auto" />
              </li>
            </ol>
            <p class="text-xs text-muted">
              Needs the sources <code>{{ librarySummary.sources.join(', ') || 'none' }}</code> and the blocks
              <code>{{ librarySummary.blocks.join(', ') }}</code
              >. An app whose kit lacks one skips the widgets that use it and says so.
            </p>
          </div>
        </template>
        <template #usage>
          <pre class="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">{{ usage }}</pre>
        </template>
      </UTabs>
    </template>
    <template #footer>
      <div class="flex w-full justify-between gap-2">
        <UButton
          label="Import instead"
          icon="i-lucide-upload"
          color="neutral"
          variant="ghost"
          @click="((s.open.export = false), (s.open.import = true))"
        />
        <div class="flex gap-2">
          <UButton label="Copy JSON" icon="i-lucide-copy" color="neutral" variant="outline" :disabled="tab === 'usage'" @click="copy" />
          <UButton
            :label="tab === 'library' ? `Download ${libraryFile}` : 'Download'"
            icon="i-lucide-download"
            :disabled="tab === 'usage'"
            @click="download"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
