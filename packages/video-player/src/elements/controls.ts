import { defineCustomElement } from 'vue'
import Scrubber from '@/components/controls/Scrubber.vue'
import PlayButton from '@/components/controls/PlayButton.vue'
import MuteButton from '@/components/controls/MuteButton.vue'
import FullscreenButton from '@/components/controls/FullscreenButton.vue'
import Buffering from '@/components/controls/Buffering.vue'
import LoopButton from '@/components/controls/LoopButton.vue'
import PipButton from '@/components/controls/PipButton.vue'
import CaptionsButton from '@/components/controls/CaptionsButton.vue'
import QualityButton from '@/components/controls/QualityButton.vue'
import PlaybackRateButton from '@/components/controls/PlaybackRateButton.vue'
import VolumeSlider from '@/components/controls/VolumeSlider.vue'
import TimeDisplay from '@/components/controls/TimeDisplay.vue'
import Transcript from '@/components/controls/Transcript.vue'

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

customElements.define('ml-controls-scrubber', ScrubberElement)
customElements.define('ml-controls-play-button', PlayButtonElement)
customElements.define('ml-controls-mute-button', MuteButtonElement)
customElements.define('ml-controls-fullscreen-button', FullscreenButtonElement)
customElements.define('ml-controls-buffering', BufferingElement)
customElements.define('ml-controls-loop-button', LoopButtonElement)
customElements.define('ml-controls-pip-button', PipButtonElement)
customElements.define('ml-controls-captions-button', CaptionsButtonElement)
customElements.define('ml-controls-quality-button', QualityButtonElement)
customElements.define('ml-controls-playback-rate-button', PlaybackRateButtonElement)
customElements.define('ml-controls-volume-slider', VolumeSliderElement)
customElements.define('ml-controls-time-display', TimeDisplayElement)
customElements.define('ml-controls-transcript', TranscriptElement)

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
