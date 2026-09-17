import { createApp, defineComponent, h } from 'vue'
import { VideoStage, VideoCard } from '@munsonlabs/video-player'
import '@munsonlabs/video-player/style'

const src = new URLSearchParams(location.search).get('src') ?? '/media/flower.mp4'
const entry = { title: 'Perf clip', src }

const Page = defineComponent({
  render: () => h('div', { style: 'max-width:800px;margin:0 auto' }, [h(VideoStage, { playlist: [entry] }), h(VideoCard, { ...entry, lazy: true })]),
})

createApp(Page).mount('#app')
