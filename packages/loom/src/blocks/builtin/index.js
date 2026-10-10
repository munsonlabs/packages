import Stack, { spec as stackSpec } from './Stack.vue'
import Text, { spec as textSpec } from './Text.vue'
import Image, { spec as imageSpec } from './Image.vue'
import Button, { spec as buttonSpec } from './Button.vue'

/**
 * The blocks every kit has, by type: each one's spec, from its SFC, and the component that draws
 * it. The same shape as a kit's own block. Editors list them in this order, and their CSS loads
 * in it.
 */
export const builtinBlocks = {
  Stack: { ...stackSpec, component: Stack },
  Text: { ...textSpec, component: Text },
  Image: { ...imageSpec, component: Image },
  Button: { ...buttonSpec, component: Button },
}
