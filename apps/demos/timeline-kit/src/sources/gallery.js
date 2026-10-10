import { computed } from 'vue'
import { imageUrl, composableSource } from './shared'

/** A photo gallery's pictures. */
export function useGallery(props) {
  const photos = computed(() =>
    (props.story.entry.images ?? [])
      .filter((image) => image.src)
      .map((image) => ({ src: imageUrl(image.src, props.story.baseURL), caption: image.caption, credit: image.credit })),
  )
  return {
    photos,
    count: computed(() => photos.value.length),
    countLabel: computed(() => `${photos.value.length} photo${photos.value.length === 1 ? '' : 's'}`),
    cover: computed(() => photos.value[0]?.src),
  }
}

export const gallerySource = composableSource({
  id: 'gallery',
  label: 'Gallery',
  description: "A gallery's photos, with captions and credits.",
  fields: {
    photos: { type: 'list', description: 'Every photo', item: { '': 'object', src: 'string', caption: 'string', credit: 'string' } },
    count: { type: 'number', description: 'How many photos' },
    countLabel: { type: 'string', description: '"12 photos"' },
    cover: { type: 'string', description: 'The first photo' },
  },
  use: useGallery,
})
