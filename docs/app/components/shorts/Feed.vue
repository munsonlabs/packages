<script setup lang="ts">
import { ref, shallowRef, onMounted, type Component } from 'vue'
import Slide from './components/Slide.vue'
import Nav from './components/Nav.vue'
import { registerShortsIcons } from './icons'
import { provideShortsParts } from './parts'
import { useRecycler } from './composables/useRecycler'
import { useShortsFeed } from './composables/useShortsFeed'

const parts = shallowRef<Record<string, Component> | null>(null)
const failed = ref(false)
const scroller = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const uiHidden = ref(false)

provideShortsParts(parts)

const { shorts, failed: feedFailed, loadMore, refresh } = useShortsFeed()
const { slots, index, onScroll, go, reset } = useRecycler(scroller, shorts, loadMore)

function refreshFeed(): void {
  reset()
  refresh()
}

onMounted(async () => {
  try {
    const [m, vueSigil] = await Promise.all([
      import('@munsonlabs/video-player'),
      import('@munsonlabs/sigil/vue'),
      import('@munsonlabs/video-player/style'),
      registerShortsIcons(),
    ])
    parts.value = {
      VideoCard: m.VideoCard,
      PlayButton: m.PlayButton,
      MuteButton: m.MuteButton,
      CaptionsButton: m.CaptionsButton,
      QualityButton: m.QualityButton,
      Scrubber: m.Scrubber,
      Buffering: m.Buffering,
      Sigil: vueSigil.Sigil,
    }
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <ClientOnly>
    <div class="shorts">
      <p v-if="failed" class="shorts__status">Could not load <code>@munsonlabs/video-player</code>.</p>
      <p v-else-if="feedFailed" class="shorts__status">Could not load the feed.</p>

      <div v-else-if="parts" ref="stage" class="shorts__stage">
        <div ref="scroller" class="shorts__scroller" @scroll.passive="onScroll">
          <div v-for="(short, slot) in slots" :key="short?.id ?? `empty-${slot}`" class="shorts__slide">
            <Slide v-if="short" :short="short" v-model:ui-hidden="uiHidden" />
          </div>
        </div>

        <Nav :stage="stage" :index="index" :count="shorts.length" @go="go" @refresh="refreshFeed" />
      </div>

      <p v-else class="shorts__status">Loading the feed…</p>
    </div>

    <template #fallback>
      <p class="shorts__status">Loading the feed…</p>
    </template>
  </ClientOnly>
</template>

<style scoped>
@import './styles/feed.css';
</style>
