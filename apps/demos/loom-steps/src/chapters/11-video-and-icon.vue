<script>
export const chapter = {
  step: 11,
  title: 'Video and Icon blocks',
  subject: 'feat(loom): Video and Icon blocks as optional entries',
}
</script>

<script setup>
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit } from '../kit'

const card = {
  version: 2,
  id: 'video-card',
  name: 'Video card',
  root: {
    id: 'card',
    type: 'Stack',
    children: [
      {
        id: 'clip',
        type: 'Video',
        props: { src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', label: 'Big Buck Bunny' },
        bind: { poster: 'article.image' },
      },
      {
        id: 'meta',
        type: 'Stack',
        props: { direction: 'row', align: 'center' },
        children: [
          { id: 'icon', type: 'Icon', props: { name: 'clock', color: 'var(--w-accent)' } },
          { id: 'time', type: 'Text', props: { variant: 'caption' }, bind: { text: 'article.readTime' } },
          { id: 'push', type: 'Spacer', props: { grow: true } },
          { id: 'share', type: 'Icon', props: { name: 'share-2', label: 'Share' } },
        ],
      },
      { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
    ],
  },
}
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/blocks/video/Video.vue',
      'packages/loom/src/blocks/video/index.js',
      'packages/loom/src/blocks/icon/Icon.vue',
      'packages/loom/src/blocks/icon/index.js',
      'packages/loom/package.json',
      'packages/loom/vite.config.js',
    ]"
  >
    <p>
      <code>@munsonlabs/loom/video</code> exports <code>videoBlock</code>, a Video block on <code>@munsonlabs/video-player</code>'s
      <code>VideoCard</code>; <code>@munsonlabs/loom/icon</code> exports <code>iconBlock</code>, an Icon block drawn by
      <code>@munsonlabs/sigil</code>.
    </p>
    <p>
      Each is its own entry with an optional peer dependency, so only apps that use them load the player or the icon registry. Both are built like a
      kit's own block: <code>defineBlock</code> and a component, <code>Video.vue</code> and <code>Icon.vue</code>.
    </p>

    <template #example>
      <div class="row">
        <Widget style="width: 420px; max-width: 100%" :kit="kit" :definition="card" :data="articles[0]" />
      </div>
    </template>
  </ChapterPage>
</template>
