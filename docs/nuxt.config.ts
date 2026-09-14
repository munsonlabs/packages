const baseURL = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/?$/, '/')

export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag.startsWith('ml-'),
    },
  },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `${baseURL}favicon.svg` }],
    },
  },
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
