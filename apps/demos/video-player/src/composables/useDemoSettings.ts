import { ref, computed, watchEffect } from 'vue'
import type { PlayerAction } from '@munsonlabs/video-player'
import { usePersisted, usePersistedCycle } from './usePersisted'
import { useEventLog } from './useEventLog'

const PIN_POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'full-width'] as const
const POPUP_ALIGNS = ['center', 'flex-end'] as const

const THEME_COLORS = [
  { varName: '--mlv-accent', label: 'Accent', fallback: '#3b82f6' },
  { varName: '--mlv-btn-bg', label: 'Button Background', fallback: '#60a5fa' },
  { varName: '--mlv-btn-color', label: 'Button Color', fallback: '#93c5fd' },
]

function loadTheme(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('player:theme') ?? '{}')
  } catch {
    return {}
  }
}

const BOOKMARK_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/></svg>`
const BOOKMARK_OUTLINE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`

const { val: webComponents, toggle: toggleWebComponents } = usePersisted('player:webComponents')
const { val: showStage, toggle: toggleStage } = usePersisted('player:showStage', true)
const { val: lazy, toggle: toggleLazy } = usePersisted('player:lazy', true)
const { val: nativeUi, toggle: toggleNativeUi } = usePersisted('player:nativeUi')
const { val: disableTapCapture, toggle: toggleDisableTapCapture } = usePersisted('player:disableTapCapture')
const { val: pin, cycle: cyclePinPosition } = usePersistedCycle('player:pin', PIN_POSITIONS, 'bottom-right')
const { val: popupAlign, cycle: cyclePopupAlign } = usePersistedCycle('player:popupAlign', POPUP_ALIGNS, 'center')

const { val: actionMute, toggle: toggleActionMute } = usePersisted('player:action:mute')
const { val: actionLoop, toggle: toggleActionLoop } = usePersisted('player:action:loop')
const { val: actionSave, toggle: toggleActionSave } = usePersisted('player:action:save')
const { val: actionAutoplay, toggle: toggleActionAutoplay } = usePersisted('player:action:autoplay')

const theme = ref<Record<string, string>>(loadTheme())
const radius = computed(() => parseInt(theme.value['--mlv-radius'] ?? '12', 10))

function setThemeVar(varName: string, value: string): void {
  theme.value = { ...theme.value, [varName]: value }
}

function resetTheme(): void {
  theme.value = {}
}

watchEffect(() => {
  const style = document.documentElement.style
  for (const varName of [...THEME_COLORS.map((c) => c.varName), '--mlv-radius']) {
    const value = theme.value[varName]
    if (value) style.setProperty(varName, value)
    else style.removeProperty(varName)
  }
  localStorage.setItem('player:theme', JSON.stringify(theme.value))
})

watchEffect(() => {
  document.documentElement.style.setProperty('--mlv-popup-align', popupAlign.value)
})

const savedStates = ref<Record<string, boolean>>({})

function saveActionFor(videoUrl: string): PlayerAction {
  const { addLog } = useEventLog()
  const isSaved = savedStates.value[videoUrl] ?? false
  return {
    icon: isSaved ? BOOKMARK_ICON : BOOKMARK_OUTLINE_ICON,
    label: isSaved ? 'Unsave' : 'Save',
    onClick: () => {
      savedStates.value = { ...savedStates.value, [videoUrl]: !isSaved }
      addLog({ type: isSaved ? 'unsave' : 'save', currentTime: 0, duration: 0, src: videoUrl })
    },
  }
}

const currentAction = computed((): PlayerAction | null => {
  if (actionMute.value) return 'mute'
  if (actionLoop.value) return 'loop'
  if (actionAutoplay.value) return 'autoplay'
  return null
})

export function useDemoSettings() {
  return {
    PIN_POSITIONS,
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
    currentAction,
    saveActionFor,
    theme,
    radius,
    setThemeVar,
    resetTheme,
  }
}
