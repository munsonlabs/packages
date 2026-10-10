import base from '@munsonlabs/shipkit/vite/vue.config'

const basePack = base.pack ?? {}

export default {
  ...base,
  pack: {
    ...basePack,
    dts: false,
    entry: { index: 'src/index.js', editor: 'src/editor.js', video: 'src/blocks/video/index.js', icon: 'src/blocks/icon/index.js' },
    deps: { neverBundle: ['vue', /^@munsonlabs\/video-player/, /^@munsonlabs\/sigil/], alwaysBundle: [/\.css$/] },
  },
}
