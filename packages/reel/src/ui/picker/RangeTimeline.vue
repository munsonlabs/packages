<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatTime, moveHandle, shiftRange, type Range, type RangeLimits } from '@/ui/picker/features/range'

const props = defineProps<{
  range: Range
  limits: RangeLimits
  time: number | null
  aspect: number
  disabled: boolean
  filmstrip?: 'ready' | 'unavailable'
  labels: { start: string; end: string }
}>()

const emit = defineEmits<{
  change: [range: Range, seekTo: number]
  seek: [time: number]
}>()

const TILES = 10
const STRIP_HEIGHT = 64
const STEP = 0.5
/**
 * Pixels a press on the selection travels before it slides the range; released sooner, it is a
 * click that seeks.
 */
const DRAG_THRESHOLD = 4
/**
 * How far outside the range the playhead may be (a loop overshooting its end) before it hides.
 */
const PLAYHEAD_SLACK = 0.5

const timeline = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
/**
 * A handle or the selection is being dragged: the preview shows that frame, so the playhead hides.
 */
const rangeDrag = ref(false)

const span = computed(() => props.limits.max - props.limits.min || 1)
const percent = (time: number) => `${((time - props.limits.min) / span.value) * 100}%`
const length = computed(() => props.range.end - props.range.start)

const playhead = computed(() => {
  const { start, end } = props.range
  const time = props.time
  if (time === null || rangeDrag.value || length.value <= 0 || time < start - PLAYHEAD_SLACK || time > end + PLAYHEAD_SLACK) {
    return null
  }
  return percent(Math.min(end, Math.max(start, time)))
})

/**
 * Pointer capture fails for a pointer that is already gone (or a synthetic one); dragging still
 * works without it.
 */
function capture(pointerId: number): void {
  try {
    timeline.value?.setPointerCapture(pointerId)
  } catch {
    // Without capture the drag ends if the pointer leaves the strip, which is acceptable.
  }
}

function timeAt(clientX: number): number {
  const box = timeline.value!.getBoundingClientRect()
  const fraction = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
  return props.limits.min + fraction * span.value
}

/**
 * Dragging the end handle shows a second before it, so the frame is one the clip contains.
 */
function change(range: Range, handle: 'start' | 'end' | 'both'): void {
  emit('change', range, handle === 'end' ? Math.max(range.start, range.end - 1) : range.start)
}

type Kind = 'start' | 'end' | 'both' | 'scrub'
let drag: { kind: Kind; anchor: number; range: Range; x: number; moved: boolean } | null = null

/**
 * A handle drags at once. On the selection, a press released within `DRAG_THRESHOLD` pixels is a click
 * that seeks, one that travels further slides the range. The playhead drags to scrub. Presses outside the
 * selection do nothing. Seeks never move the handles.
 */
function onPointerDown(event: PointerEvent): void {
  if (props.disabled) return
  const target = event.target as HTMLElement
  const handle = target.dataset.handle as 'start' | 'end' | undefined
  const kind: Kind | null =
    handle ?? (target.classList.contains('reel-playhead') ? 'scrub' : target.classList.contains('reel-selection') ? 'both' : null)
  if (!kind) return
  event.preventDefault()
  capture(event.pointerId)
  drag = { kind, anchor: timeAt(event.clientX), range: props.range, x: event.clientX, moved: false }
  if (handle) {
    target.focus()
    rangeDrag.value = true
  } else if (kind === 'scrub') {
    emit('seek', drag.anchor)
  }
}

function onPointerMove(event: PointerEvent): void {
  if (!drag) return
  if (drag.kind === 'both' && !drag.moved) {
    if (Math.abs(event.clientX - drag.x) < DRAG_THRESHOLD) return
    drag.moved = true
    rangeDrag.value = true
  }
  const time = timeAt(event.clientX)
  if (drag.kind === 'scrub') {
    emit('seek', time)
  } else if (drag.kind === 'both') {
    change(shiftRange(drag.range, time - drag.anchor, props.limits), 'both')
  } else {
    change(moveHandle(props.range, drag.kind, time, props.limits), drag.kind)
  }
}

function onPointerUp(event: PointerEvent): void {
  if (drag?.kind === 'both' && !drag.moved && event.type === 'pointerup') {
    emit('seek', timeAt(event.clientX))
  }
  drag = null
  rangeDrag.value = false
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

function tiles(): { draw: (index: number, image: CanvasImageSource) => void } {
  const strip = canvas.value!
  const height = Math.round(STRIP_HEIGHT * Math.min(2, globalThis.devicePixelRatio || 1))
  const ratio = Number.isFinite(props.aspect) && props.aspect > 0 ? props.aspect : 16 / 9
  const width = Math.round(height * ratio * TILES)
  strip.width = width
  strip.height = height
  const ctx = strip.getContext('2d')!
  const slot = width / TILES
  const gap = Math.max(1, Math.round(height / 64))
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = getComputedStyle(strip).getPropertyValue('--_tile').trim() || 'rgba(255, 255, 255, 0.06)'
  for (let i = 0; i < TILES; i++) {
    ctx.fillRect(Math.round(i * slot) + gap, gap, Math.round(slot) - gap * 2, height - gap * 2)
  }
  return {
    draw: (index, image) => {
      const x = Math.round(index * slot)
      ctx.clearRect(x, 0, Math.round(slot), height)
      ctx.drawImage(image, x, 0, Math.round(slot), height)
    },
  }
}

onMounted(tiles)
watch(() => props.aspect, tiles)

defineExpose({ tiles, TILES })
</script>

<template>
  <div class="reel-range">
    <div
      ref="timeline"
      class="reel-timeline"
      :data-filmstrip="filmstrip"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <canvas ref="canvas" aria-hidden="true" />
      <div class="reel-selection" aria-hidden="true" :style="{ left: percent(range.start), width: `${(length / span) * 100}%` }" />
      <div class="reel-playhead" aria-hidden="true" :hidden="playhead === null" :style="{ left: playhead ?? undefined }" />
      <div
        v-for="handle in ['start', 'end'] as const"
        :key="handle"
        class="reel-handle"
        :data-handle="handle"
        role="slider"
        tabindex="0"
        :aria-label="labels[handle]"
        :aria-valuemin="limits.min"
        :aria-valuemax="limits.max"
        :aria-valuenow="range[handle]"
        :aria-valuetext="formatTime(range[handle])"
        :aria-disabled="disabled"
        :style="{ left: percent(range[handle]) }"
      />
    </div>
    <p class="reel-times">
      <span>{{ formatTime(range.start) }}</span>
      <strong>{{ Math.round(length * 10) / 10 }}s</strong>
      <span>{{ formatTime(range.end) }}</span>
    </p>
  </div>
</template>

<style scoped>
.reel-range {
  display: grid;
  gap: 8px;
}

.reel-timeline {
  position: relative;
  height: 64px;
  border-radius: calc(var(--_radius) / 1.6);
  background: var(--_surface);
  overflow: hidden;
  touch-action: none;
}

canvas {
  --_tile: var(--reel-tile-placeholder, rgba(255, 255, 255, 0.06));
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.85;
}

.reel-selection {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  background: var(--_range);
  border-block: 3px solid var(--_accent);
  cursor: grab;
}

.reel-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  margin-left: -6px;
  cursor: col-resize;
}

.reel-playhead[hidden] {
  display: none;
}

.reel-playhead::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 5px;
  width: 2px;
  background: var(--reel-playhead, #fff);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.reel-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 14px;
  margin-left: -7px;
  border-radius: 4px;
  background: var(--_accent);
  cursor: ew-resize;
}

.reel-handle::after {
  content: '';
  position: absolute;
  top: 35%;
  bottom: 35%;
  left: 5px;
  width: 4px;
  box-sizing: border-box;
  border-inline: 1px solid var(--_accent-fg);
}

.reel-times {
  margin: 0;
  display: flex;
  justify-content: space-between;
  color: var(--_muted);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.reel-times strong {
  color: var(--_fg);
}
</style>
