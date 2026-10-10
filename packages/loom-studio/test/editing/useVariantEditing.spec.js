import { describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'
import { BASE_VARIANT } from '@munsonlabs/loom/editor'
import { useHistory } from '@/editing/useHistory'
import { useVariantEditing } from '@/editing/useVariantEditing'
import { inScope, model } from '@test/fixtures'

function setup() {
  const definition = model()
  return inScope(() => {
    const history = useHistory(definition)
    return { definition, history, variants: useVariantEditing(definition, history.change) }
  })
}

describe('useVariantEditing', () => {
  it('hides a node in the variant being edited, never on the base, and never the root', () => {
    const { definition, variants } = setup()
    variants.variantId.value = 'small'
    variants.toggleHidden('body')
    expect(definition.value.variants[0].overrides).toEqual({ body: { hidden: true } })
    expect(variants.tree.value.hidden.has('body')).toBe(true)
    expect(definition.value.root.children.map((c) => c.id)).toContain('body')

    variants.toggleHidden('body')
    expect(definition.value.variants[0].overrides).toBeUndefined()
    variants.toggleHidden('root')
    expect(definition.value.variants[0].overrides).toBeUndefined()
  })

  it('resets one field back to the base, leaving the rest of the override', () => {
    const { definition, history, variants } = setup()
    variants.variantId.value = 'small'
    history.change((d) => (d.variants[0].overrides = { body: { props: { text: 'Short', variant: 'caption' }, hidden: true } }))
    variants.resetField('body', { field: 'prop', name: 'text' })
    expect(definition.value.variants[0].overrides).toEqual({ body: { props: { variant: 'caption' }, hidden: true } })
  })

  it('goes back to the base when the variant being edited is deleted', async () => {
    const { history, variants } = setup()
    variants.variantId.value = 'small'
    await nextTick()
    history.change((d) => delete d.variants)
    await nextTick()
    expect(variants.variantId.value).toBe(BASE_VARIANT)
    expect(variants.variantLabel('small')).toBe('small')
  })
})
