import { createApp } from 'vue'
import '@munsonlabs/video-player/style'
import '@munsonlabs/video-player/element'
import { registerCloudflareAdapter } from './adapters/cloudflareAdapter'
import App from './App.vue'

registerCloudflareAdapter()
createApp(App).mount('#app')
