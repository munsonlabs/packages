<script setup>
import { computed, ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { useStudio } from '../studio'

/** Export: this widget's JSON, and how to use it. */
const s = useStudio()
const toast = useToast()

const json = computed(() => JSON.stringify(s.definition, null, 2))
const libraryFile = computed(() => `${s.props.kit.id ?? 'widgets'}.library.json`)

const usage = computed(
  () =>
    `<script setup>
import { Widget, provideKit, loadLibrary } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
import { kit } from './kit' // your sources and blocks

provideKit(kit, context) // context: what your sources need, e.g. a bridge or a cart

// The whole library, fetched at runtime: widgets this app can't render are skipped and reported.
const { widgets, skipped, missing } = loadLibrary(kit, await (await fetch('/${libraryFile.value}')).json())
</` +
    `script>

<template>
  <!-- Each item gets the first widget whose conditions it meets, then the variant its rules pick. -->
  <Widget v-for="(item, i) in items" :key="item.id" :definitions="widgets" :data="item" :index="i" />
</template>`,
)

const tab = ref('widget')
const tabs = [
  { label: 'This widget', value: 'widget', slot: 'widget' },
  { label: 'Usage', value: 'usage', slot: 'usage' },
]

function exported() {
  return { text: json.value, file: `${s.definition.id}.widget.json` }
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
          <UButton label="Download" icon="i-lucide-download" :disabled="tab === 'usage'" @click="download" />
        </div>
      </div>
    </template>
  </UModal>
</template>
