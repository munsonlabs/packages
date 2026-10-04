<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { activeCues } from '@/captions/cues'
import { createCaptionPainter } from '@/render/captions'
import type { CaptionCue, CaptionStyle } from '@/types'

/**
 * The clip's captions in miniature: the same `createCaptionPainter` the export uses, laid out at the
 * export's size (`layoutWidth` x `layoutHeight`) and drawn scaled to the canvas, so lines break where the
 * clip's do. Redrawn when the cues on show, the style or the size change.
 */
const props = defineProps<{
  cues: CaptionCue[]
  time: number | null
  captionStyle?: CaptionStyle
  layoutWidth?: number
  layoutHeight?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const painter = shallowRef<ReturnType<typeof createCaptionPainter> | null>(null)
let drawn: string | null = null
let observer: ResizeObserver | null = null

function draw(force = false): void {
  const element = canvas.value
  const paint = painter.value
  if (!element || !paint) return
  const showing = props.time === null || !props.cues.length ? [] : activeCues(props.cues, props.time)
  const key = paint.showing(showing)
  if (!force && key === drawn) return
  drawn = key
  const ctx = element.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, element.width, element.height)
  const offscreen = scratch(element.width, element.height)
  if (!offscreen) {
    paint(ctx, showing)
    return
  }
  offscreen.ctx.clearRect(0, 0, element.width, element.height)
  paint(offscreen.ctx, showing)
  ctx.drawImage(offscreen.canvas, 0, 0)
}

/**
 * An `OffscreenCanvas` the size of the frame to paint on, as the export does. Firefox picks a
 * different face for the same CSS font on an `OffscreenCanvas` than on a page's `<canvas>` (about 6%
 * narrower for the system font), so painting here and copying the picture over keeps the preview's
 * glyphs the export's.
 */
let offscreen: { canvas: OffscreenCanvas; ctx: OffscreenCanvasRenderingContext2D } | null = null
function scratch(width: number, height: number) {
  if (typeof OffscreenCanvas === 'undefined') return null
  if (!offscreen || offscreen.canvas.width !== width || offscreen.canvas.height !== height) {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    offscreen = ctx ? { canvas, ctx } : null
  }
  return offscreen
}

function build(width: number, height: number): ReturnType<typeof createCaptionPainter> {
  return createCaptionPainter(width, height, props.captionStyle, { layoutWidth: props.layoutWidth, layoutHeight: props.layoutHeight })
}

function resize(): void {
  const element = canvas.value
  // Hidden (the finished clip's screen hides the editor): keep the canvas as it is for coming back.
  if (!element || element.clientWidth === 0 || element.clientHeight === 0) return
  const ratio = globalThis.devicePixelRatio || 1
  const width = Math.max(1, Math.round(element.clientWidth * ratio))
  const height = Math.max(1, Math.round(element.clientHeight * ratio))
  if (element.width !== width || element.height !== height || !painter.value) {
    element.width = width
    element.height = height
    painter.value = build(width, height)
  }
  draw(true)
}

watch(
  () => [props.captionStyle, props.layoutWidth, props.layoutHeight],
  () => {
    const element = canvas.value
    if (!element) return
    painter.value = build(element.width, element.height)
    draw(true)
  },
  { deep: true },
)
watch(
  () => props.cues,
  () => draw(true),
)
watch(
  () => props.time,
  () => draw(),
)

onMounted(() => {
  resize()
  if (typeof ResizeObserver !== 'undefined' && canvas.value) {
    observer = new ResizeObserver(resize)
    observer.observe(canvas.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <canvas ref="canvas" class="reel-captions" aria-hidden="true" />
</template>

<style scoped>
.reel-captions {
  position: absolute;
  inset: 0;
  z-index: 4;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
