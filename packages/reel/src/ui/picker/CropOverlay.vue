<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { planCrop } from '@/clip/crop'
import { planStamp } from '@/render/stamp'
import type { CaptionCue, CaptionStyle, ImageSource } from '@/types'
import type { PickerStamp } from '@/registries/pickerDefaults'
import CaptionOverlay from '@/ui/picker/CaptionOverlay.vue'

/**
 * The 9:16 window drawn over the page's player: the part of the picture the clip keeps, dragged (or
 * moved with the arrow keys) to reframe, with the stamp and the captions previewed inside it as the
 * export draws them. The picture fills the player's shell, so the window's box is the crop plan as
 * fractions of the source.
 */
const props = defineProps<{
  size: { width: number; height: number }
  exportSize: { width: number; height: number }
  disabled: boolean
  label: string
  hint: string
  logo?: ImageSource
  stamp: PickerStamp | null
  cues: CaptionCue[]
  time: number | null
  captionStyle?: CaptionStyle
}>()

const focus = defineModel<{ x: number; y: number }>('focus', { required: true })

const FOCUS_STEP = 0.05
const FRAME = { width: 900, height: 1600 }

const plan = computed(() => planCrop(props.size.width, props.size.height, { aspect: '9:16', focus: focus.value }))
const horizontal = computed(() => props.size.width / props.size.height > 9 / 16)

const boxStyle = computed(() => {
  const { width, height } = props.size
  const p = plan.value
  return {
    left: `${(p.left / width) * 100}%`,
    top: `${(p.top / height) * 100}%`,
    width: `${(p.width / width) * 100}%`,
    height: `${(p.height / height) * 100}%`,
  }
})

const value = computed(() => Math.round((horizontal.value ? focus.value.x : focus.value.y) * 100))
const valueText = computed(() => {
  const v = value.value
  return v < 40 ? `${v}%, left of centre` : v > 60 ? `${v}%, right of centre` : `${v}%, centred`
})

function clamp(value: number, axis: 'x' | 'y'): number {
  const { width, height } = props.size
  const whole = planCrop(width, height, { aspect: '9:16' })
  const fraction = axis === 'x' ? whole.width / width : whole.height / height
  return Math.min(1 - fraction / 2, Math.max(fraction / 2, value))
}

function move(dx: number, dy: number): void {
  focus.value = { x: clamp(focus.value.x + dx, 'x'), y: clamp(focus.value.y + dy, 'y') }
}

const root = ref<HTMLElement | null>(null)
let last: { x: number; y: number } | null = null

function onPointerDown(event: PointerEvent): void {
  if (props.disabled) return
  try {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  } catch {
    // A pointer that is already gone cannot be captured; the drag still works without it.
  }
  last = { x: event.clientX, y: event.clientY }
}

/**
 * The overlay spans the whole picture, so a pixel of drag is that fraction of the source.
 */
function onPointerMove(event: PointerEvent): void {
  const box = root.value?.getBoundingClientRect()
  if (!last || !box) return
  move((event.clientX - last.x) / box.width, (event.clientY - last.y) / box.height)
  last = { x: event.clientX, y: event.clientY }
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const step = event.shiftKey ? FOCUS_STEP * 4 : FOCUS_STEP
  const moves: Record<string, number> = { ArrowLeft: -step, ArrowDown: step, ArrowRight: step, ArrowUp: -step, Home: -1, End: 1 }
  const delta = moves[event.key]
  if (delta === undefined) return
  event.preventDefault()
  move(horizontal.value ? delta : 0, horizontal.value ? 0 : delta)
}

const logoUrl = ref('')
let objectUrl: string | null = null
watch(
  () => props.logo,
  (logo) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = logo instanceof Blob ? URL.createObjectURL(logo) : null
    if (objectUrl) logoUrl.value = objectUrl
    else if (typeof logo === 'string' || logo instanceof URL) logoUrl.value = String(logo)
    else if (typeof HTMLImageElement !== 'undefined' && logo instanceof HTMLImageElement) logoUrl.value = logo.currentSrc || logo.src
    else logoUrl.value = ''
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})

const natural = ref<{ width: number; height: number } | null>(null)
watch(logoUrl, () => (natural.value = null))

function onStampLoad(event: Event): void {
  const image = event.target as HTMLImageElement
  natural.value = image.naturalWidth > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : null
}

const stampStyle = computed(() => {
  if (!props.stamp || !natural.value) return null
  const box = planStamp(FRAME.width, FRAME.height, natural.value, props.stamp)
  const opacity = Math.min(1, Math.max(0, props.stamp.opacity ?? 0.9))
  return {
    left: `${(box.x / FRAME.width) * 100}%`,
    top: `${(box.y / FRAME.height) * 100}%`,
    width: `${(box.width / FRAME.width) * 100}%`,
    height: `${(box.height / FRAME.height) * 100}%`,
    opacity: String(opacity),
  }
})
</script>

<template>
  <div ref="root" class="reel-overlay" :class="{ 'reel-overlay--disabled': disabled }">
    <div
      class="reel-crop"
      role="slider"
      tabindex="0"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="value"
      :aria-valuetext="valueText"
      :aria-disabled="disabled"
      :style="boxStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="last = null"
      @pointercancel="last = null"
      @keydown="onKeydown"
    >
      <img
        v-if="logoUrl && stamp"
        class="reel-stamp"
        :src="logoUrl"
        alt=""
        aria-hidden="true"
        :hidden="!stampStyle"
        :style="stampStyle ?? undefined"
        @load="onStampLoad"
        @error="natural = null"
      />
      <CaptionOverlay :cues="cues" :time="time" :caption-style="captionStyle" :layout-width="exportSize.width" :layout-height="exportSize.height" />
      <div class="reel-hint" aria-hidden="true">{{ hint }}</div>
    </div>
  </div>
</template>

<style scoped>
.reel-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none;
}

.reel-crop {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid var(--reel-accent, #e2a32e);
  /* Everything outside the window is dimmed: what the clip leaves out. */
  box-shadow: 0 0 0 200vmax var(--reel-scrim, rgba(0, 0, 0, 0.55));
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
}

.reel-crop:active {
  cursor: grabbing;
}

.reel-overlay--disabled .reel-crop {
  cursor: default;
}

.reel-crop:focus-visible {
  outline: 3px solid var(--reel-focus, #ffd36b);
  outline-offset: 2px;
}

.reel-stamp {
  position: absolute;
  object-fit: contain;
  pointer-events: none;
}

.reel-stamp[hidden] {
  display: none;
}

.reel-hint {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font: 600 0.7rem var(--reel-font, system-ui, sans-serif);
  white-space: nowrap;
  pointer-events: none;
}
</style>
