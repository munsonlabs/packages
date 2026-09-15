export default defineAppConfig({
  seo: {
    // %separator is dropped when %s is empty, so the home page (no title of
    // its own) renders as just the site name rather than "- Stuff I find useful".
    // Docus's nuxt.schema.ts types `seo` as title/description only, but its
    // app.vue reads titleTemplate and seeds a "%s - <site name>" default.
    // @ts-expect-error titleTemplate is missing from the Docus schema type
    titleTemplate: '%s %separator %siteName',
  },
  navigation: {
    sub: 'header',
  },
  socials: {
    npm: 'https://www.npmjs.com/org/munsonlabs',
  },
  ui: {
    colors: {
      primary: 'orange',
      secondary: 'sky',
    },
  },
  github: {
    url: 'https://github.com/munsonlabs/packages',
  },
})
