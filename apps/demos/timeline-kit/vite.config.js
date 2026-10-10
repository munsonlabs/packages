import { mergeConfig } from 'vite-plus'
import base from '@munsonlabs/shipkit/vite/vue.config'
import { loomFromSource } from './vite'

export default mergeConfig(base, { resolve: { alias: loomFromSource } })
