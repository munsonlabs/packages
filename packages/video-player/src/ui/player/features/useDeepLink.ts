import { watch, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { PLAYER_SHELL_CLASS } from '@/constants'
import { claimDeepLink, releaseDeepLinks } from '@/registries/deepLinkRegistry'
import { parseDeepLink, type DeepLink } from '@/utils/mediaFragment'
import type { PlayerProps } from '@/types/player'
import type { PlayerState } from '@/ui/player/playerState'
import type { UseClipRangeReturn } from '@/ui/player/features/useClipRange'

export interface DeepLinkDeps {
  seek: (seconds: number) => void
  setClipRange: UseClipRangeReturn['setClipRange']
}

/**
 * Lets a player answer a page URL that points at a moment in it: `#ml-t=42,52`, as `@munsonlabs/reel`
 * clip links write it, optionally with `&ml-player=<id>`. Opt-in through the `deepLink` prop: `true`
 * answers links without an id (first such player on the page wins), a string answers links naming it
 * as well.
 *
 * On a match the player scrolls into view, seeks to the start once the duration is known, and sets
 * the link as its clip range (`setClipRange`), which the scrubber highlights and which pauses at the
 * end (`deepLinkEnd: 'pause'`, the default), loops until the viewer seeks away (`'loop'`), or plays on
 * (`'continue'`). A later `hashchange` is a new link.
 */
export function useDeepLink(videoEl: Ref<HTMLVideoElement | null>, props: PlayerProps, state: PlayerState, deps: DeepLinkDeps): void {
  const owner = Symbol('deep-link')
  let pendingSeek: number | null = null

  function accepts(link: DeepLink): boolean {
    const id = typeof props.deepLink === 'string' && props.deepLink !== '' ? props.deepLink : null
    if (link.target !== null) return link.target === id
    return true
  }

  function scrollIntoView(): void {
    const el = videoEl.value
    if (!el) return
    const shell = el.closest(`.${PLAYER_SHELL_CLASS}`) ?? el
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    shell.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }

  function apply(): void {
    if (props.deepLink === undefined || props.deepLink === false) return
    const link = parseDeepLink(location)
    if (!link || !accepts(link)) return
    if (!claimDeepLink(location.hash, owner)) return

    deps.setClipRange({ start: link.start, end: link.end }, { end: props.deepLinkEnd ?? 'pause' })
    scrollIntoView()
    if (state.duration.value) {
      deps.seek(link.start)
    } else {
      pendingSeek = link.start
    }
  }

  watch(state.duration, (duration) => {
    if (!duration || pendingSeek === null) return
    deps.seek(pendingSeek)
    pendingSeek = null
  })

  onMounted(() => {
    apply()
    window.addEventListener('hashchange', apply)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', apply)
    releaseDeepLinks(owner)
  })
}
