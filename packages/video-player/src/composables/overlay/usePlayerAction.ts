import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { BuiltinAction, CustomAction, PlayerAction } from '@/types/player'
import type { PlayerContext, PlaylistContext } from '@/composables/player/playerContext'

export interface UsePlayerActionReturn {
  currentAction: ComputedRef<PlayerAction | null>
  isCustom: ComputedRef<boolean>
  customAction: ComputedRef<CustomAction | null>
  builtinLabel: ComputedRef<string>
  builtinActive: ComputedRef<boolean>
  onBuiltinClick: () => void
}

interface BuiltinActionDef {
  label: (player: PlayerContext, playlist: PlaylistContext) => string
  active: (player: PlayerContext, playlist: PlaylistContext) => boolean
  onClick: (player: PlayerContext, playlist: PlaylistContext) => void
}

const BUILTIN_ACTIONS: Record<BuiltinAction, BuiltinActionDef> = {
  mute: {
    label: (player) => (player.isMuted ? 'Unmute' : 'Mute'),
    active: (player) => player.isMuted,
    onClick: (player) => player.toggleMute(),
  },
  loop: {
    label: (player) => (player.isLooping ? 'Disable loop' : 'Loop'),
    active: (player) => player.isLooping,
    onClick: (player) => player.toggleLoop(),
  },
  autoplay: {
    label: (_player, playlist) => (playlist.autoAdvance ? 'Disable autoplay next' : 'Autoplay next'),
    active: (_player, playlist) => playlist.autoAdvance,
    onClick: (_player, playlist) => playlist.toggleAutoAdvance(),
  },
}

export function usePlayerAction(
  action: Ref<PlayerAction | null | undefined> | undefined,
  player: PlayerContext,
  playlist: PlaylistContext,
): UsePlayerActionReturn {
  const currentAction = computed(() => action?.value ?? null)
  const isCustom = computed(() => !!currentAction.value && typeof currentAction.value === 'object')
  const customAction = computed(() => (isCustom.value ? (currentAction.value as CustomAction) : null))
  const builtinDef = computed(() => (isCustom.value || !currentAction.value ? null : BUILTIN_ACTIONS[currentAction.value as BuiltinAction]))

  const builtinLabel = computed(() => builtinDef.value?.label(player, playlist) ?? '')
  const builtinActive = computed(() => builtinDef.value?.active(player, playlist) ?? false)

  function onBuiltinClick(): void {
    builtinDef.value?.onClick(player, playlist)
  }

  return { currentAction, isCustom, customAction, builtinLabel, builtinActive, onBuiltinClick }
}
