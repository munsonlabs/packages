import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { getFormattedVersion } from '../../utils/version.ts'

const gitVersion = getFormattedVersion()

export const plugins = [
  vue(),
  {
    name: 'shipkit-version-html',
    transformIndexHtml(html: string) {
      return html.replaceAll('VITE_GIT_VERSION', gitVersion)
    },
  } satisfies Plugin,
]
