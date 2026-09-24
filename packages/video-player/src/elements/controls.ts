import { defineCustomElement } from 'vue'
import Scrubber from '@/ui/controls/Scrubber.vue'
import PlayButton from '@/ui/controls/PlayButton.vue'
import MuteButton from '@/ui/controls/MuteButton.vue'
import FullscreenButton from '@/ui/controls/FullscreenButton.vue'
import Buffering from '@/ui/controls/Buffering.vue'
import LoopButton from '@/ui/controls/LoopButton.vue'
import PipButton from '@/ui/controls/PipButton.vue'
import CaptionsButton from '@/ui/controls/CaptionsButton.vue'
import QualityButton from '@/ui/controls/QualityButton.vue'
import PlaybackRateButton from '@/ui/controls/PlaybackRateButton.vue'
import VolumeSlider from '@/ui/controls/VolumeSlider.vue'
import TimeDisplay from '@/ui/controls/TimeDisplay.vue'
import Transcript from '@/ui/controls/Transcript.vue'

const ScrubberElement = defineCustomElement(Scrubber, { shadowRoot: false })
const PlayButtonElement = defineCustomElement(PlayButton, { shadowRoot: false })
const MuteButtonElement = defineCustomElement(MuteButton, { shadowRoot: false })
const FullscreenButtonElement = defineCustomElement(FullscreenButton, { shadowRoot: false })
const BufferingElement = defineCustomElement(Buffering, { shadowRoot: false })
const LoopButtonElement = defineCustomElement(LoopButton, { shadowRoot: false })
const PipButtonElement = defineCustomElement(PipButton, { shadowRoot: false })
const CaptionsButtonElement = defineCustomElement(CaptionsButton, { shadowRoot: false })
const QualityButtonElement = defineCustomElement(QualityButton, { shadowRoot: false })
const PlaybackRateButtonElement = defineCustomElement(PlaybackRateButton, { shadowRoot: false })
const VolumeSliderElement = defineCustomElement(VolumeSlider, { shadowRoot: false })
const TimeDisplayElement = defineCustomElement(TimeDisplay, { shadowRoot: false })
const TranscriptElement = defineCustomElement(Transcript, { shadowRoot: false })

customElements.define('ml-video-scrubber', ScrubberElement)
customElements.define('ml-video-play-button', PlayButtonElement)
customElements.define('ml-video-mute-button', MuteButtonElement)
customElements.define('ml-video-fullscreen-button', FullscreenButtonElement)
customElements.define('ml-video-buffering', BufferingElement)
customElements.define('ml-video-loop-button', LoopButtonElement)
customElements.define('ml-video-pip-button', PipButtonElement)
customElements.define('ml-video-captions-button', CaptionsButtonElement)
customElements.define('ml-video-quality-button', QualityButtonElement)
customElements.define('ml-video-playback-rate-button', PlaybackRateButtonElement)
customElements.define('ml-video-volume-slider', VolumeSliderElement)
customElements.define('ml-video-time-display', TimeDisplayElement)
customElements.define('ml-video-transcript', TranscriptElement)

export {
  ScrubberElement,
  PlayButtonElement,
  MuteButtonElement,
  FullscreenButtonElement,
  BufferingElement,
  LoopButtonElement,
  PipButtonElement,
  CaptionsButtonElement,
  QualityButtonElement,
  PlaybackRateButtonElement,
  VolumeSliderElement,
  TimeDisplayElement,
  TranscriptElement,
}
