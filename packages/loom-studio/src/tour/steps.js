/**
 * @typedef {TourStep & object} StudioTourStep
 * @property {string} title
 * @property {string} body
 * @property {string[]} [tips] Keys or tips shown under the body.
 * @property {'top' | 'right' | 'bottom' | 'left'} [side]
 * @property {() => void} [enter] Runs when the step opens: select something, close something, so the step has what it points at.
 */

/**
 * What the tour needs from the studio to show each feature for real.
 *
 * @typedef {object} StudioTourApi
 * @property {() => Element | null | undefined} widget
 * @property {() => Element | null | undefined} inspector
 * @property {() => Element | null | undefined} selection
 * @property {() => void} openEditor Selects an element worth demonstrating and opens its editor.
 * @property {() => void} closeEditor Keeps the selection but closes its editor.
 * @property {() => void} clearSelection Clears the selection, leaving the canvas plain.
 */

/** useTour only resolves `#id` and `.class` selectors, so attribute-marked targets are looked up here. */
const at = (name) => () => document.querySelector(`[data-tour="${name}"]`)

/**
 * The guided tour of Loom Studio, step by step, over the real UI.
 *
 * @param {StudioTourApi} api
 * @returns {StudioTourStep[]}
 */
export function tourSteps(api) {
  return [
    {
      target: null,
      title: 'Welcome to Loom Studio',
      body: 'You build widgets here by clicking them. This tour shows each part of the studio on your own widget. It takes about a minute, and you can skip it whenever you like.',
      enter: api.clearSelection,
    },
    {
      target: api.widget,
      side: 'right',
      title: 'Your widget, live',
      body: "This is the widget itself, rendering real sample data through your app's own composables. What you see here is what ships.",
      enter: api.clearSelection,
    },
    {
      target: api.inspector,
      side: 'bottom',
      title: 'Click anything to edit it',
      body: 'Its editor opens right beside it. Along the top is the path up through its containers, and the buttons to add, move, nest, duplicate and delete.',
      tips: ['Esc closes the editor, then deselects', '⌘↑ / ⌘↓ move it among its siblings', '⌘D duplicates it, Backspace deletes it'],
      enter: api.openEditor,
    },
    {
      target: api.inspector,
      side: 'bottom',
      title: 'Four tabs',
      body: 'Content: each property, either typed in or bound to data. Actions: what a click runs. Show when: a value that must be true for it to appear. Style: CSS, using the theme’s variables.',
      tips: [
        '“Bind to data…” lists every value your sources provide, filtered to the ones that fit',
        'Inside a Repeat, Item and Position appear at the top',
      ],
      enter: api.openEditor,
    },
    {
      target: api.selection,
      side: 'right',
      title: 'Drag to move',
      body: 'Drag any element to move it. A line shows where it will land between its neighbours, and a dashed box means it will drop into a container.',
      tips: ['A press only becomes a drag after a few pixels, so clicks still select'],
      enter: api.closeEditor,
    },
    {
      target: at('layers'),
      side: 'bottom',
      title: 'Layers',
      body: 'The whole widget as a tree. Click a row to select it, drag rows to move them, and reach anything that isn’t on screen: hidden in a variant, or empty for this sample.',
      tips: ['L opens and closes it', 'Drop in the middle of a container to nest inside it'],
      enter: api.clearSelection,
    },
    {
      target: at('palette'),
      side: 'bottom',
      title: 'Everything, from the keyboard',
      body: 'Jump to any element, including hidden ones, add a block, switch variant or open any panel.',
      tips: ['⌘K opens it from anywhere'],
      enter: api.clearSelection,
    },
    {
      target: at('variant'),
      side: 'top',
      title: 'Variants',
      body: "One widget, different presentations: compact for narrow slots, a paywalled look for locked content. Pick one here to edit it. Your changes become overrides, deleting hides, and moving changes only that variant's order.",
      tips: [
        'Each variant has a rule: a value from the data, the widget’s width, or both',
        'The first variant whose rule matches is the one that renders',
      ],
    },
    {
      target: at('sample'),
      side: 'top',
      title: 'Preview with real data',
      body: 'Switch between your sample data. Only the samples this widget renders for are offered.',
    },
    {
      target: at('widths'),
      side: 'top',
      title: 'Widths',
      body: 'Narrow, phone, tablet or the full width. Variants can switch on size: sm is under 300px, md is from 300px and lg is from 500px.',
    },
    {
      target: at('rules'),
      side: 'top',
      title: 'Let the rules decide',
      body: "Off: you see the variant you're editing. On: the variants' rules pick one, just as in production, and the button names it. It turns amber when that isn't the one you're editing.",
    },
    {
      target: at('try'),
      side: 'top',
      title: 'Try it',
      body: "Switches clicks from selecting to using the widget: buttons save, links open, actions run against your app's context.",
    },
    {
      target: at('calls'),
      side: 'top',
      title: 'See what it asks of your app',
      body: 'Every call the widget makes to its context is logged here with its arguments, and each click shows a toast naming what it called.',
    },
    {
      target: at('theme'),
      side: 'bottom',
      title: 'Theme',
      body: "Design tokens: the palette, roles such as gap and title size, and the type, space and shape scales. Your kit's theme sets them; this is where a widget overrides one, and every block follows.",
      tips: [
        'Gaps, padding, radius and colour fields everywhere pick from these scales',
        'Preview light and dark with the sun and moon in the bottom bar; the studio itself switches from the top bar',
      ],
    },
    {
      target: at('issues'),
      side: 'bottom',
      title: 'Always valid',
      body: 'A tick means it renders as written, in every variant. Otherwise each issue is listed here, and clicking one takes you straight to it.',
    },
    {
      target: at('publish'),
      side: 'bottom',
      title: 'Export and publish',
      body: 'The widget is a single JSON document. Export it, or publish it to your app. There’s no build and no deploy, because your app renders it with the same kit.',
      tips: ['Undo and redo sit near the start of this bar: ⌘Z and ⇧⌘Z'],
    },
    {
      target: at('identity'),
      side: 'bottom',
      title: 'Name, data and your app',
      body: "The widget's name, and the data it renders for. Your app can add its own controls here too, such as switching widgets or creating a new one.",
    },
    {
      target: at('help'),
      side: 'bottom',
      title: "That's the studio",
      body: 'Start by clicking something in your widget. You can replay this tour from here at any time.',
    },
  ]
}
