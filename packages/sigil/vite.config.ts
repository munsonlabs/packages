import base from '@munsonlabs/shipkit/vite/vue.config'

const basePack = (base as any).pack ?? {}

export default {
  ...base,
  pack: {
    ...basePack,
    entry: {
      index: 'src/index.ts',
      element: 'src/element/index.ts',
      vue: 'src/vue.ts',
    },
    deps: { neverBundle: ['vue'] },
  },
}
