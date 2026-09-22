<script setup lang="ts">
import '@/ui/styles/playerSurface.css'
import { ref, computed, reactive, toRef, provide, inject, watch, nextTick } from 'vue'
import { usePlayer } from '@/ui/player/usePlayer'
import { createKeyboardShortcuts } from '@/ui/player/features/createKeyboardShortcuts'
import { useHud } from '@/ui/overlay/useHud'
import { exposePlayerSurface } from '@/ui/player/playerSurface'
import { PlayerKey, HudKey, ActionKey, PlaylistKey, NO_PLAYLIST } from '@/ui/player/playerContext'
import PlayerOverlay from '@/ui/overlay/PlayerOverlay.vue'
import AdOverlay from '@/ui/overlay/AdOverlay.vue'
import PlayButton from '@/ui/controls/PlayButton.vue'
import PinnablePlayerShell from '@/ui/pinned/PinnablePlayerShell.vue'
import PlainPlayerShell from '@/ui/pinned/PlainPlayerShell.vue'
import PinnedControls from '@/ui/pinned/PinnedControls.vue'
import type { StateChangeEvent, PlayerProps } from '@/types/player'
import { parseAspectRatio } from '@/utils/aspectRatio'
import { DEFAULT_ASPECT_RATIO, PLAYER_SHELL_CLASS } from '@/constants'
import '@/ui/styles/playPauseButton.css'
import '@/ui/styles/pinnedCorner.css'

const props = withDefaults(defineProps<PlayerProps>(), {
  label: '',
  adTagUrl: '',
  poster: '',
  autoplay: false,
  muted: undefined,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  tracks: () => [],
  nativeUi: false,
  payload: () => ({}),
  action: null,
  disableTapCapture: false,
  disableKeyboardShortcuts: false,
  controls: true,
  playInView: false,
  loop: false,
  preload: undefined,
  captionLine: undefined,
  quality: undefined,
})

const emit = defineEmits<{ 'state-change': [event: StateChangeEvent] }>()

const videoEl = ref(null)

const player = reactive(usePlayer(videoEl, props, emit))
const hud = reactive(useHud(toRef(player, 'isPlaying'), toRef(player, 'isFullscreen')))
const { onKeydown } = createKeyboardShortcuts(player, hud)

function handleKeydown(e: KeyboardEvent): void {
  if (props.disableKeyboardShortcuts) return
  onKeydown(e)
}

const shellEl = ref<HTMLElement | null>(null)

/** Fullscreen otherwise leaves focus wherever it was (often nowhere, if triggered via a HUD button that then gets covered) - shortcuts would silently do nothing until the viewer clicked back into the now-fullscreen shell. */
watch(
  () => player.isFullscreen,
  (isFullscreen) => {
    if (isFullscreen && !props.disableKeyboardShortcuts) {
      nextTick(() => shellEl.value?.focus())
    }
  },
)

/** ControlsPopup swaps its main row for MoreMenu/VolumePanel via v-if, which unmounts whatever HUD button was just clicked - the browser resets focus to <body> when a focused node is removed, and shortcuts would otherwise go dead until the viewer clicked back in. Only reclaims focus once it's landed on <body> outright, so a real Tab/click to something else on the page is left alone. */
function handleFocusOut(e: FocusEvent): void {
  if (props.disableKeyboardShortcuts) return
  const next = e.relatedTarget as Node | null
  if (next && shellEl.value?.contains(next)) return
  requestAnimationFrame(() => {
    if (document.activeElement === document.body) shellEl.value?.focus()
  })
}

provide(PlayerKey, player)
provide(HudKey, hud)
provide(ActionKey, toRef(props, 'action'))
provide(PlaylistKey, inject(PlaylistKey, NO_PLAYLIST))

const shellAspectRatio = computed(() => parseAspectRatio(props.aspectRatio))
const isPortrait = computed(() => shellAspectRatio.value.isPortrait)
const shellAspect = computed(() => shellAspectRatio.value.cssRatio)

const videoHidden = computed(() => !props.poster && !player.isReady)

const shell = computed(() => (props.pin ? PinnablePlayerShell : PlainPlayerShell))

function onPinDismiss(unpin: () => void): void {
  player.pause()
  unpin()
}

function onTapCapture(): void {
  hud.onVideoTap()
  player.fire('tap')
}

defineExpose(exposePlayerSurface(player))
</script>

<template>
  <component :is="shell" :is-playing="player.isPlaying">
    <template #default="{ isPinned, isTucked, setBoxEl, unpin, scrollToPlayer }">
      <div
        :ref="setBoxEl"
        class="player"
        :class="{
          'player--pinned': isPinned,
          'player--tucked': isTucked,
          [`player--pin-${pin}`]: isPinned,
        }"
      >
        <PinnedControls v-if="isPinned" @scroll-to="scrollToPlayer" @dismiss="onPinDismiss(unpin)" />

        <div
          ref="shellEl"
          :class="[PLAYER_SHELL_CLASS, { 'player__shell--portrait': isPortrait }]"
          :style="{ aspectRatio: shellAspect }"
          role="group"
          :aria-label="label || 'Video player'"
          :tabindex="disableKeyboardShortcuts ? undefined : 0"
          @mousemove="hud.onMouseMove()"
          @contextmenu.capture.prevent
          @mouseleave="hud.onMouseLeave()"
          @keydown="handleKeydown"
          @focusout="handleFocusOut"
        >
          <div data-mlv-player>
            <video
              ref="videoEl"
              class="mlv-video"
              :class="{ 'mlv-video--hidden': videoHidden }"
              :poster="props.poster"
              :preload="props.preload"
              playsinline
            >
              <track
                v-for="(t, i) in props.tracks"
                :key="`${t.src}-${i}`"
                :src="t.src"
                :kind="t.kind ?? 'captions'"
                :srclang="t.srclang"
                :label="t.label"
                :default="t.default"
              />
            </video>

            <div
              v-if="!props.disableTapCapture && !player.isNativeUi && player.hasStarted && !player.isAdPlaying"
              class="overlay__tap-capture"
              @click="onTapCapture"
              @touchend.prevent.stop="onTapCapture"
            />

            <AdOverlay v-if="player.isAdPlaying && !player.isNativeUi" />

            <PlayerOverlay v-if="props.controls && !player.isNativeUi" />

            <div v-if="props.controls && player.isNativeUi && !player.hasStarted" class="player__native-play">
              <PlayButton class="ppbtn ppbtn--lg" />
            </div>

            <!-- Custom HUD. Controls placed here find this player through context, no wiring needed. -->
            <div v-if="$slots.default" class="player__custom-hud">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </template>
  </component>
</template>

<style scoped>
.player {
  position: relative;
  width: 100%;
  max-width: var(--mlv-max-width, 800px);
  margin: 0 auto;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.player--pinned {
  position: fixed;
  margin: 0;
  z-index: 100;
  width: 70dvw;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  transition: transform 0.18s ease;
}

@media (max-width: 740px) {
  .player--pinned {
    max-width: 300px;
  }
}

[data-mlv-player] {
  position: absolute;
  inset: 0;
}

.player__shell {
  position: relative;
  border-radius: var(--mlv-radius, 12px);
  overflow: hidden;
  background: #000;
  cursor: pointer;
  container-type: inline-size;
  container-name: player-shell;
}

.mlv-video--hidden {
  opacity: 0;
}

.overlay__tap-capture {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.mlv-youtube .overlay__tap-capture {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 64px 100%, 64px calc(100% - 64px), 0 calc(100% - 64px));
}

.mlv-dailymotion .overlay__tap-capture {
  clip-path: polygon(0 64px, 0 100%, 100% 100%, 100% 0, 64px 0, 64px 64px);
}

.player__shell--portrait {
  max-height: 75dvh;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
}

.player__custom-hud {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.player__custom-hud > * {
  pointer-events: auto;
}

.player__native-play {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.player__native-play > * {
  pointer-events: auto;
}

.player__shell:fullscreen {
  border-radius: 0;
  width: 100vw;
  height: 100dvh;
}

.player__shell:fullscreen .mlv-video,
.player__shell:fullscreen [data-mlv-player] {
  width: 100% !important;
  height: 100% !important;
}
</style>
