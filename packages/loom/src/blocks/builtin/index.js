import Stack, { spec as stackSpec } from './Stack.vue'
import Text, { spec as textSpec } from './Text.vue'
import Image, { spec as imageSpec } from './Image.vue'
import Button, { spec as buttonSpec } from './Button.vue'
import Link, { spec as linkSpec } from './Link.vue'
import Badge, { spec as badgeSpec } from './Badge.vue'
import Divider, { spec as dividerSpec } from './Divider.vue'
import Spacer, { spec as spacerSpec } from './Spacer.vue'
import Repeat, { spec as repeatSpec } from './Repeat.vue'
import Box, { spec as boxSpec } from './Box.vue'
import Grid, { spec as gridSpec } from './Grid.vue'
import Carousel, { spec as carouselSpec } from './Carousel.vue'
import Avatar, { spec as avatarSpec } from './Avatar.vue'
import Rating, { spec as ratingSpec } from './Rating.vue'
import Progress, { spec as progressSpec } from './Progress.vue'

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
  Link: { ...linkSpec, component: Link },
  Badge: { ...badgeSpec, component: Badge },
  Divider: { ...dividerSpec, component: Divider },
  Spacer: { ...spacerSpec, component: Spacer },
  Repeat: { ...repeatSpec, component: Repeat },
  Box: { ...boxSpec, component: Box },
  Grid: { ...gridSpec, component: Grid },
  Carousel: { ...carouselSpec, component: Carousel },
  Avatar: { ...avatarSpec, component: Avatar },
  Rating: { ...ratingSpec, component: Rating },
  Progress: { ...progressSpec, component: Progress },
}
