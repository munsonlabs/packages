<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatTime, moveHandle, shiftRange, type Range, type RangeLimits } from './features/range'

const props = defineProps<{
  range: Range
  limits: RangeLimits
  time: number | null
  aspect: number
  disabled: boolean
  labels: { start: string; end: string }
}>()

const emit = defineEmits<{
  change: [range: Range, seekTo: number]
  seek: [time: number]
}>()

const THUMBNAILS = 10
const STRIP_HEIGHT = 64
const STEP = 0.5
const DRAG_THRESHOLD = 4
const PLAYHEAD_SLACK = 0.5

type DragKind = 'start' | 'end' | 'both' | 'scrub'

const timeline = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const isDraggingRange = ref(false)
let drag: { kind: DragKind; anchor: number; range: Range; x: number; moved: boolean } | null = null

const span = computed(() => props.limits.max - props.limits.min || 1)
const length = computed(() => props.range.end - props.range.start)
const toPercent = (time: number) => `${((time - props.limits.min) / span.value) * 100}%`

const playhead = computed(() => {
  const { start, end } = props.range
  const { time } = props
  const isOutside = time === null || time < start - PLAYHEAD_SLACK || time > end + PLAYHEAD_SLACK
  if (isOutside || isDraggingRange.value || length.value <= 0) return null
  return toPercent(Math.min(end, Math.max(start, time)))
})

function getTimeAt(clientX: number): number {
  const box = timeline.value!.getBoundingClientRect()
  const fraction = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
  return props.limits.min + fraction * span.value
}

/**
 * While dragging the end handle we show the frame a second before it, so you're always looking at a
 * frame that's in the clip.
 */
function change(range: Range, handle: 'start' | 'end' | 'both'): void {
  const seekTo = handle === 'end' ? Math.max(range.start, range.end - 1) : range.start
  emit('change', range, seekTo)
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled) return
  const target = event.target as HTMLElement
  const handle = target.dataset.handle as 'start' | 'end' | undefined
  const isPlayhead = target.classList.contains('splice-playhead')
  const isSelection = target.classList.contains('splice-selection')
  const kind: DragKind | null = handle ?? (isPlayhead ? 'scrub' : isSelection ? 'both' : null)
  if (!kind) return

  event.preventDefault()
  /**
   * Only capture real pointers. Capturing one that isn't active throws, and the drag works fine
   * without it.
   */
  if (event.isTrusted) timeline.value?.setPointerCapture(event.pointerId)
  drag = { kind, anchor: getTimeAt(event.clientX), range: props.range, x: event.clientX, moved: false }

  if (handle) {
    target.focus()
    isDraggingRange.value = true
  } else if (kind === 'scrub') {
    emit('seek', drag.anchor)
  }
}

function onPointerMove(event: PointerEvent): void {
  if (!drag) return
  if (drag.kind === 'both' && !drag.moved) {
    if (Math.abs(event.clientX - drag.x) < DRAG_THRESHOLD) return
    drag.moved = true
    isDraggingRange.value = true
  }

  const time = getTimeAt(event.clientX)
  if (drag.kind === 'scrub') emit('seek', time)
  else if (drag.kind === 'both') change(shiftRange(drag.range, time - drag.anchor, props.limits), 'both')
  else change(moveHandle(props.range, drag.kind, time, props.limits), drag.kind)
}

function onPointerUp(event: PointerEvent): void {
  const isClick = drag?.kind === 'both' && !drag.moved && event.type === 'pointerup'
  if (isClick) emit('seek', getTimeAt(event.clientX))
  drag = null
  isDraggingRange.value = false
}

function onKeydown(event: KeyboardEvent): void {
  const handle = (event.target as HTMLElement).dataset.handle as 'start' | 'end' | undefined
  if (!handle || props.disabled) return

  const big = STEP * 10
  const current = props.range[handle]
  const step = event.shiftKey ? big : STEP
  const targets: Record<string, number> = {
    ArrowLeft: current - step,
    ArrowDown: current - step,
    ArrowRight: current + step,
    ArrowUp: current + step,
    PageDown: current - big,
    PageUp: current + big,
    Home: -Infinity,
    End: Infinity,
  }
  const value = targets[event.key]
  if (value === undefined) return

  event.preventDefault()
  change(moveHandle(props.range, handle, value, props.limits), handle)
}

/**
 * Resets the filmstrip to placeholder tiles and gives back a function that draws a thumbnail into
 * its slot.
 */
function createFilmstrip(): { draw: (index: number, image: CanvasImageSource) => void } {
  const strip = canvas.value!
  const ctx = strip.getContext('2d')!
  const aspect = Number.isFinite(props.aspect) && props.aspect > 0 ? props.aspect : 16 / 9
  const height = Math.round(STRIP_HEIGHT * Math.min(2, globalThis.devicePixelRatio || 1))
  const width = Math.round(height * aspect * THUMBNAILS)
  const slot = width / THUMBNAILS
  const gap = Math.max(1, Math.round(height / 64))

  strip.width = width
  strip.height = height
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  for (let index = 0; index < THUMBNAILS; index++) {
    ctx.fillRect(Math.round(index * slot) + gap, gap, Math.round(slot) - gap * 2, height - gap * 2)
  }

  return {
    draw: (index, image) => {
      const x = Math.round(index * slot)
      ctx.clearRect(x, 0, Math.round(slot), height)
      ctx.drawImage(image, x, 0, Math.round(slot), height)
    },
  }
}

onMounted(createFilmstrip)
watch(() => props.aspect, createFilmstrip)

defineExpose({ createFilmstrip, THUMBNAILS })
</script>

<template>
  <div class="splice-range">
    <div
      ref="timeline"
      class="splice-timeline"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <canvas ref="canvas" aria-hidden="true" />
      <div class="splice-selection" aria-hidden="true" :style="{ left: toPercent(range.start), width: `${(length / span) * 100}%` }" />
      <div class="splice-playhead" aria-hidden="true" :hidden="playhead === null" :style="{ left: playhead ?? undefined }" />
      <div
        v-for="handle in ['start', 'end'] as const"
        :key="handle"
        class="splice-handle"
        :data-handle="handle"
        role="slider"
        tabindex="0"
        :aria-label="labels[handle]"
        :aria-valuemin="limits.min"
        :aria-valuemax="limits.max"
        :aria-valuenow="range[handle]"
        :aria-valuetext="formatTime(range[handle])"
        :aria-disabled="disabled"
        :style="{ left: toPercent(range[handle]) }"
      />
    </div>
    <p class="splice-times">
      <span>{{ formatTime(range.start) }}</span>
      <strong>{{ Math.round(length * 10) / 10 }}s</strong>
      <span>{{ formatTime(range.end) }}</span>
    </p>
  </div>
</template>

<style scoped>
.splice-range {
  display: grid;
  gap: 8px;
}

.splice-timeline {
  position: relative;
  height: 64px;
  border-radius: calc(var(--_radius) / 1.6);
  background: var(--_surface);
  overflow: hidden;
  touch-action: none;
}

canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.85;
}

.splice-selection {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  background: var(--_range);
  border-block: 3px solid var(--_accent);
  cursor: grab;
}

.splice-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  margin-left: -6px;
  cursor: col-resize;
}

.splice-playhead[hidden] {
  display: none;
}

.splice-playhead::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 5px;
  width: 2px;
  background: var(--splice-playhead, #fff);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.splice-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 14px;
  margin-left: -7px;
  border-radius: 4px;
  background: var(--_accent);
  cursor: ew-resize;
}

.splice-handle::after {
  content: '';
  position: absolute;
  top: 35%;
  bottom: 35%;
  left: 5px;
  width: 4px;
  box-sizing: border-box;
  border-inline: 1px solid var(--_accent-fg);
}

.splice-times {
  margin: 0;
  display: flex;
  justify-content: space-between;
  color: var(--_muted);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.splice-times strong {
  color: var(--_fg);
}
</style>
