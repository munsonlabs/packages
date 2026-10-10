import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import { BoltBridgeVue } from 'bolt-bridge-stub'
import '@munsonlabs/loom/style.css'
import '@munsonlabs/video-player/style'
import './main.css'
// The native app first, so the bridge finds it when it connects.
import './native'
import { registerIcons } from 'timeline-kit'
import App from './App.vue'

// The kit's widgets use Lucide icons.
void registerIcons()

// As in a Bolt timeline: connect the bridge to the native app, and provide it as `globalBridge`.
createApp(App).use(ui).use(BoltBridgeVue).mount('#app')
