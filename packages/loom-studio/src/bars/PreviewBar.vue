<script setup>
import VariantsPanel from '../panels/VariantsPanel.vue'
import { viewportHint, viewports } from '../preview/usePreview'
import { useStudio } from '../studio'

/**
 * Bottom centre: how the widget is previewed. The variant being edited (and its rules), the
 * sample data, the theme, the width, and whether rules pick the variant.
 */
const s = useStudio()
</script>

<template>
  <div class="loom-bar absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full p-1">
    <UPopover v-model:open="s.open.variants" :content="{ side: 'top', align: 'center', sideOffset: 8 }">
      <UButton
        :label="s.variants.variantLabel(s.variants.variantId)"
        icon="i-lucide-git-branch"
        trailing-icon="i-lucide-chevron-down"
        size="sm"
        :color="s.variants.variant ? 'warning' : 'neutral'"
        :variant="s.variants.variant ? 'soft' : 'ghost'"
        class="rounded-full"
      />
      <template #content>
        <div class="w-80">
          <div class="flex flex-wrap gap-1 border-b border-default p-2">
            <UButton
              v-for="v in s.variants.variantOptions"
              :key="v.value"
              :label="v.label"
              size="xs"
              :color="v.value === s.variants.variantId ? 'primary' : 'neutral'"
              :variant="v.value === s.variants.variantId ? 'soft' : 'ghost'"
              class="rounded-full"
              @click="s.variants.variantId = v.value"
            />
          </div>
          <div v-if="s.variants.variant && s.variants.tree.hidden.size" class="border-b border-default p-2">
            <p class="px-1 pb-1 text-xs text-muted">Hidden in {{ s.variants.variant.label }}</p>
            <div class="flex flex-wrap gap-1">
              <UButton
                v-for="id in s.variants.tree.hidden"
                :key="id"
                :label="`#${id}`"
                icon="i-lucide-eye"
                size="xs"
                color="neutral"
                variant="outline"
                class="rounded-full"
                @click="s.variants.toggleHidden(id)"
              />
            </div>
          </div>
          <div class="max-h-[60vh] overflow-y-auto">
            <VariantsPanel
              :kit="s.props.kit"
              :theme-id="s.preview.themeId"
              :definition="s.definition"
              :active-id="s.variants.variantId"
              @change="(variants) => s.history.change((d) => (d.variants = variants.length ? variants : undefined))"
              @select="s.variants.variantId = $event"
            />
          </div>
        </div>
      </template>
    </UPopover>

    <USelect
      v-model="s.preview.sampleIndex"
      :items="s.preview.sampleOptions"
      value-key="value"
      icon="i-lucide-database"
      size="sm"
      variant="ghost"
      class="w-48"
      aria-label="Preview data"
    />

    <USelect
      v-if="s.preview.themeOptions.length > 1"
      v-model="s.preview.themeId"
      :items="s.preview.themeOptions"
      value-key="value"
      icon="i-lucide-palette"
      size="sm"
      variant="ghost"
      class="w-28"
      aria-label="Preview theme"
    />

    <div class="flex items-center">
      <UTooltip v-for="vp in viewports" :key="vp.label" :text="`${vp.label}: ${viewportHint(vp.width)}`">
        <UButton
          :icon="vp.icon"
          size="sm"
          :color="s.preview.viewport === vp ? 'primary' : 'neutral'"
          :variant="s.preview.viewport === vp ? 'soft' : 'ghost'"
          class="rounded-full"
          :aria-label="vp.label"
          @click="s.preview.viewport = vp"
        />
      </UTooltip>
    </div>

    <UTooltip
      :text="
        s.preview.followRules
          ? `Rules picked ${s.variants.variantLabel(s.preview.matchedVariant)}`
          : 'Let the variants\' rules pick, as in production'
      "
    >
      <UButton
        :label="s.preview.followRules ? s.variants.variantLabel(s.preview.matchedVariant) : 'Rules'"
        icon="i-lucide-wand-sparkles"
        size="sm"
        :color="s.preview.followRules ? (s.preview.matchedVariant === s.variants.variantId ? 'primary' : 'warning') : 'neutral'"
        :variant="s.preview.followRules ? 'soft' : 'ghost'"
        class="rounded-full"
        @click="s.preview.followRules = !s.preview.followRules"
      />
    </UTooltip>
  </div>
</template>
