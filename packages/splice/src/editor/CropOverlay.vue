<script setup lang="ts">
import { computed, ref } from 'vue'
import { planCrop } from '@/splice/crop'
import PreviewCanvas from './PreviewCanvas.vue'
import type { CaptionCue, CaptionPosition, CaptionStyle, StampOptions, WatermarkOptions } from '@/types/splice'

const props = defineProps<{
  size: { width: number; height: number }
  disabled: boolean
  label: string
  hint: string
  cues: CaptionCue[]
  captionPosition: CaptionPosition
  captionStyle?: CaptionStyle
  time: number | null
  stamp?: StampOptions | null
  watermark?: WatermarkOptions
}>()

const focus = defineModel<{ x: number; y: number }>('focus', { required: true })

const FOCUS_STEP = 0.05

const root = ref<HTMLElement | null>(null)
let last: { x: number; y: number } | null = null

const plan = computed(() => planCrop(props.size.width, props.size.height, { aspect: '9:16', focus: focus.value }))
const isLandscape = computed(() => props.size.width / props.size.height > 9 / 16)

const windowSize = computed(() => {
  const { width, height, draw } = plan.value
  return { x: width / draw.width, y: height / draw.height }
})

const boxStyle = computed(() => {
  const { draw } = plan.value
  const percent = (value: number) => `${value * 100}%`
  return {
    left: percent(-draw.x / draw.width),
    top: percent(-draw.y / draw.height),
    width: percent(windowSize.value.x),
    height: percent(windowSize.value.y),
  }
})

const value = computed(() => Math.round((isLandscape.value ? focus.value.x : focus.value.y) * 100))
const valueText = computed(() => {
  const at = value.value
  return at < 40 ? `${at}%, left of centre` : at > 60 ? `${at}%, right of centre` : `${at}%, centred`
})

function move(dx: number, dy: number): void {
  const { x: windowX, y: windowY } = windowSize.value
  const clamp = (at: number, size: number) => Math.min(1 - size / 2, Math.max(size / 2, at))
  focus.value = { x: clamp(focus.value.x + dx, windowX), y: clamp(focus.value.y + dy, windowY) }
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled) return
  /**
   * Only capture real pointers. Capturing one that isn't active throws, and the drag works fine
   * without it.
   */
  if (event.isTrusted) (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  last = { x: event.clientX, y: event.clientY }
}

/**
 * The overlay covers the whole picture, so dragging one pixel moves the focus by that fraction of
 * the frame.
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
  move(isLandscape.value ? delta : 0, isLandscape.value ? 0 : delta)
}
</script>

<template>
  <div ref="root" class="splice-overlay" :class="{ 'splice-overlay--disabled': disabled }">
    <div
      class="splice-crop"
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
      <PreviewCanvas
        :width="plan.width"
        :height="plan.height"
        :cues="cues"
        :caption-position="captionPosition"
        :caption-style="captionStyle"
        :time="time"
        :stamp="stamp"
        :watermark="watermark"
      />
      <div class="splice-hint" aria-hidden="true">{{ hint }}</div>
    </div>
  </div>
</template>

<style scoped>
.splice-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none;
}

.splice-crop {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid var(--splice-accent, #e2a32e);
  /* Everything outside the window is dimmed: what the clip leaves out. */
  box-shadow: 0 0 0 200vmax var(--splice-scrim, rgba(0, 0, 0, 0.55));
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
}

.splice-crop:active {
  cursor: grabbing;
}

.splice-overlay--disabled .splice-crop {
  cursor: default;
}

.splice-crop:focus-visible {
  outline: 3px solid var(--splice-focus, #ffd36b);
  outline-offset: 2px;
}

.splice-hint {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font: 600 0.7rem var(--splice-font, system-ui, sans-serif);
  white-space: nowrap;
  pointer-events: none;
}
</style>
