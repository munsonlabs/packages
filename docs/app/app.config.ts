export default defineAppConfig({
  seo: {
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
      primary: 'emerald',
      secondary: 'lime',
      neutral: 'zinc',
    },
  },
  github: {
    url: 'https://github.com/munsonlabs/packages',
  },
})
