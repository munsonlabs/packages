import { fileIncludeHook } from './app/utils/fileInclude'

const baseURL = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/?$/, '/')

export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag.startsWith('ml-'),
    },
  },
  app: {
    head: {
      templateParams: { separator: '-', siteName: 'Munson Labs' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `${baseURL}favicon.svg` }],
    },
  },
  hooks: {
    'content:file:beforeParse': fileIncludeHook,
  },
  components: [
    { path: '~/components/player', pathPrefix: false },
    { path: '~/components', pathPrefix: true, ignore: ['player/**'] },
  ],
  extends: ['docus'],
  css: ['~/assets/css/main.css'],

  site: {
    name: 'Munson Labs',
    description: 'Public npm packages published under the @munsonlabs scope.',
  },
  llms: {
    domain: process.env.NUXT_SITE_URL || 'http://localhost:3000',
  },
})
