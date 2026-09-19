<script setup lang="ts">
/** Four icons with no `library` attribute; buttons switch the default with use(), a toggle adds an override. */
const { ready, failed } = useIconDemo()

const names = ['heart', 'star', 'bell', 'home']
const sets = ['lucide', 'material', 'emoji']
const active = ref('lucide')
const overridden = ref(false)

async function pick(name: string) {
  const { use } = await import('@munsonlabs/sigil')
  use(name)
  active.value = name
}

// `heart` is already pinned page-wide by the docs' demo overrides, so the toggle uses `bell` to start from a clean slate.
async function toggleOverride() {
  const { override } = await import('@munsonlabs/sigil')
  overridden.value = !overridden.value
  override('bell', overridden.value ? BRAND_OVERRIDES.bell : null)
}
</script>

<template>
  <IconDemoFrame :ready="ready" :failed="failed">
    <div class="icon-demo__row" style="margin-bottom: 1rem">
      <UButton
        v-for="set in sets"
        :key="set"
        size="sm"
        :color="active === set ? 'primary' : 'neutral'"
        :variant="active === set ? 'solid' : 'outline'"
        @click="pick(set)"
      >
        use('{{ set }}')
      </UButton>
      <UButton size="sm" color="neutral" :variant="overridden ? 'solid' : 'outline'" class="ml-auto" @click="toggleOverride">
        {{ overridden ? "override('bell', null)" : "override('bell', svg)" }}
      </UButton>
    </div>
    <div class="icon-demo__row">
      <ml-sigil v-for="name in names" :key="name" :name="name"></ml-sigil>
    </div>
  </IconDemoFrame>
</template>
