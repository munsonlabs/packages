import { describe, expect, it } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { usePreview } from '@/preview/usePreview'
import { inScope, kit, model } from '@test/fixtures'

describe('usePreview', () => {
  it('offers the samples the widget’s kind matches, and moves off one that stops matching', async () => {
    const definition = model()
    const samples = ref([
      { type: 'photo', id: 'p' },
      { type: 'note', id: 'n1' },
      { type: 'note', id: 'n2' },
    ])
    const preview = inScope(() => usePreview({ kit: () => kit, samples: () => samples.value, definition }))
    expect(preview.matchingSamples.value.map((f) => f.index)).toEqual([1, 2])
    expect(preview.sampleIndex.value).toBe(1)

    definition.value = { ...definition.value, kind: 'photo' }
    await nextTick()
    expect(preview.sampleIndex.value).toBe(0)
  })
})
