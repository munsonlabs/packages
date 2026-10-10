# `tour/`: the guided tour

A tour of the studio that runs over the real UI, on the person's own widget. It starts on a first visit (remembered in the browser) and from the **?** button.

| File               | What it does                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `steps.js`         | The steps: a title, text, tips, and what each points at (a `data-tour` marker, the widget, the element editor, the selection).                     |
| `useStudioTour.js` | Runs the steps with Nuxt UI's `useTour`: opens or closes the element editor when a step needs it, rings the current target, remembers it was seen. |
| `TourPopover.vue`  | The tour's card beside the current target, with progress and Back, Next, Skip.                                                                     |

## Technically

- Steps point at `data-tour="…"` markers through `document.querySelector` getters, because `useTour` only resolves `#id` and `.class` selectors itself.
- A step's `enter` sets up what it points at, such as selecting a demo element (a bound headline if there is one) so the editor is open to show.
- Adding a control worth explaining means a `data-tour` marker on it and a step here, in the order the bars are read.
