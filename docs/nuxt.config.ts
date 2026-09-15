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
      templateParams: { separator: '-', siteName: 'Stuff I find useful' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `${baseURL}favicon.svg` }],
    },
  },
  hooks: {
    'content:file:beforeParse': fileIncludeHook,
  },
  extends: ['docus'],
  css: ['~/assets/css/main.css'],

  site: {
    name: 'Stuff I find useful',
    description: 'Public npm packages published under the @munsonlabs scope.',
  },
  llms: {
    domain: process.env.NUXT_SITE_URL || 'http://localhost:3000',
  },
})
