<div align="center">

<img src="https://raw.githubusercontent.com/munsonlabs/packages/feat/splice/docs/public/brand/marks/splice.svg" width="176" height="176" alt="Munson Labs Splice">

# @munsonlabs/splice

</div>

**Experimental.** In-browser clip making with WebCodecs. Trim a video, crop it to 9:16, burn in captions, stamp a logo and add an end card that links back to the article, then export an MP4, all on the viewer's device. Includes `SpliceEditor`, a "clip this" editor inline on `@munsonlabs/video-player`, and `<ml-splice-editor>`, the same editor as a web component.

## Installation

```bash
npm install @munsonlabs/splice
```

## Usage

```ts
import { canSplice, createSplice } from '@munsonlabs/splice'

const check = await canSplice('/video/interview.mp4')
if (check.ok) {
  const clip = await createSplice({
    source: '/video/interview.mp4',
    start: 42,
    end: 52,
    crop: { aspect: '9:16' },
    captions: '/video/interview.en.vtt',
    origin: { url: location.href, title: document.title },
  })
}
```

The editor (`@munsonlabs/splice/vue`, `@munsonlabs/splice/element`) needs `vue` and `@munsonlabs/video-player` - see the docs.

## Docs

Full guides for clipping, cropping, captions, end cards, the editor, web component usage and browser support: **https://munsonlabs.pages.dev/splice/getting-started/introduction**
