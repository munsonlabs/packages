<script setup lang="ts">
import { useDemoSettings } from '../composables/useDemoSettings'
import { usePopover } from '../composables/usePopover'

const {
  THEME_COLORS,
  webComponents,
  toggleWebComponents,
  showStage,
  toggleStage,
  lazy,
  toggleLazy,
  nativeUi,
  toggleNativeUi,
  disableTapCapture,
  toggleDisableTapCapture,
  pin,
  cyclePinPosition,
  popupAlign,
  cyclePopupAlign,
  actionMute,
  toggleActionMute,
  actionLoop,
  toggleActionLoop,
  actionSave,
  toggleActionSave,
  actionAutoplay,
  toggleActionAutoplay,
  theme,
  radius,
  setThemeVar,
  resetTheme,
} = useDemoSettings()

const { isOpen, toggle, close } = usePopover('settings')
</script>

<template>
  <div class="popover-wrap">
    <button class="popover-btn" :class="{ 'popover-btn--active': isOpen }" @click="toggle">
      <svg
        class="popover-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
      Settings
    </button>
    <div v-if="isOpen" class="popover-backdrop" @click="close" />
    <Transition name="pop">
      <div v-if="isOpen" class="popover">
        <div class="settings-group">
          <span class="popover-group__heading">Render as</span>
          <button class="toggle" :class="{ 'toggle--active': webComponents }" @click="toggleWebComponents">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Web components
          </button>
        </div>

        <div class="settings-group">
          <span class="popover-group__heading">Player</span>
          <button class="toggle" :class="{ 'toggle--active': showStage }" @click="toggleStage">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Mounted
          </button>
          <button class="toggle" :class="{ 'toggle--active': lazy }" @click="toggleLazy">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Lazy
          </button>
          <button class="toggle" :class="{ 'toggle--active': nativeUi }" @click="toggleNativeUi">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Native UI
          </button>
          <button class="toggle" :class="{ 'toggle--active': disableTapCapture }" @click="toggleDisableTapCapture">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Disable tap capture
          </button>
          <button class="toggle toggle--cycle" @click="cyclePinPosition">
            <span>Pin</span>
            <span class="toggle__value">{{ pin }}</span>
          </button>
          <button class="toggle toggle--cycle" @click="cyclePopupAlign">
            <span>Popup align</span>
            <span class="toggle__value">{{ popupAlign === 'center' ? 'centered' : 'bottom' }}</span>
          </button>
        </div>

        <div class="settings-group">
          <span class="popover-group__heading">HUD action</span>
          <button class="toggle" :class="{ 'toggle--active': actionMute }" @click="toggleActionMute">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Mute btn
          </button>
          <button class="toggle" :class="{ 'toggle--active': actionLoop }" @click="toggleActionLoop">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Loop btn
          </button>
          <button class="toggle" :class="{ 'toggle--active': actionSave }" @click="toggleActionSave">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Save btn
          </button>
          <button class="toggle" :class="{ 'toggle--active': actionAutoplay }" @click="toggleActionAutoplay">
            <span class="toggle__track"><span class="toggle__thumb" /></span>
            Autoplay btn
          </button>
        </div>

        <div class="theme">
          <div class="theme__header">
            <span class="popover-group__heading">Theme</span>
            <button class="theme__reset" @click="resetTheme">Reset</button>
          </div>
          <label v-for="c in THEME_COLORS" :key="c.varName" class="theme__row" :title="c.varName">
            <input
              type="color"
              class="theme__swatch"
              :value="theme[c.varName] ?? c.fallback"
              @input="setThemeVar(c.varName, ($event.target as HTMLInputElement).value)"
            />
            {{ c.label }}
          </label>
          <label class="theme__row" title="--mlv-radius">
            <input
              type="range"
              class="theme__range"
              min="0"
              max="24"
              :value="radius"
              @input="setThemeVar('--mlv-radius', `${($event.target as HTMLInputElement).value}px`)"
            />
            Radius {{ radius }}px
          </label>
        </div>
      </div>
    </Transition>
  </div>
</template>
