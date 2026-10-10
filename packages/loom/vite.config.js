import base from '@munsonlabs/shipkit/vite/vue.config'

const basePack = base.pack ?? {}

export default {
  ...base,
  pack: {
    ...basePack,
    dts: false,
    entry: { index: 'src/index.js', editor: 'src/editor.js' },
    deps: { neverBundle: ['vue'], alwaysBundle: [/\.css$/] },
  },
}
