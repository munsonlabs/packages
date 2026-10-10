import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import '@munsonlabs/loom/style.css'
import './main.css'
import App from './App.vue'

// Nuxt UI, for the Loom Studio chapters.
createApp(App).use(ui).mount('#app')
