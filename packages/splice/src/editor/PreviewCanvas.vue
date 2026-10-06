<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { createCaptionPainter, createStampPainter, createWatermarkPainter } from '@/splice/render'
import { loadImage } from '@/splice/image'
import type { CaptionCue, CaptionPosition, CaptionStyle, StampOptions, WatermarkOptions } from '@/types/splice'
import type { Painter } from '@/types/internal'

const props = defineProps<{
  width: number
  height: number
  cues: CaptionCue[]
  captionPosition: CaptionPosition
  captionStyle?: CaptionStyle
  time: number | null
  stamp?: StampOptions | null
  watermark?: WatermarkOptions
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const logo = shallowRef<ImageBitmap | null>(null)
let frame: OffscreenCanvas | null = null
let observer: ResizeObserver | null = null

const paint = computed<Painter>(() => {
  const { width, height, cues, captionPosition, captionStyle, watermark, stamp } = props
  const painters = [
    createCaptionPainter(width, height, cues, captionPosition, captionStyle),
    watermark && createWatermarkPainter(width, height, watermark),
    stamp && logo.value && createStampPainter(width, height, logo.value, stamp),
  ].filter((painter): painter is Painter => !!painter)

  return (ctx, time) => painters.forEach((painter) => painter(ctx, time))
})

/**
 * Paints at the export's size on an OffscreenCanvas, same as the export, then scales it onto the
 * canvas. Firefox picks a different font face on a page canvas, so drawing straight onto it
 * wouldn't match the clip.
 */
function draw(): void {
  const element = canvas.value
  const ctx = element?.getContext('2d')
  if (!element || !ctx || element.clientWidth === 0) return

  const ratio = globalThis.devicePixelRatio || 1
  element.width = Math.round(element.clientWidth * ratio)
  element.height = Math.round(element.clientHeight * ratio)
  if (frame?.width !== props.width || frame?.height !== props.height) frame = new OffscreenCanvas(props.width, props.height)

  const frameCtx = frame.getContext('2d')!
  frameCtx.clearRect(0, 0, props.width, props.height)
  paint.value(frameCtx, props.time ?? -Infinity)
  ctx.clearRect(0, 0, element.width, element.height)
  ctx.drawImage(frame, 0, 0, element.width, element.height)
}

watch(
  () => props.stamp?.logo,
  async (source) => {
    logo.value?.close()
    logo.value = null
    const loaded = source ? await loadImage(source).catch(() => null) : null
    if (source === props.stamp?.logo) logo.value = loaded
    else loaded?.close()
  },
  { immediate: true },
)
watch([paint, () => props.time], draw)

onMounted(() => {
  draw()
  observer = new ResizeObserver(draw)
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  logo.value?.close()
})
</script>

<template>
  <canvas ref="canvas" class="splice-preview" aria-hidden="true" />
</template>

<style scoped>
.splice-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
