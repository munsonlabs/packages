# `sources/`: what widgets can show and do

One file per composable. Each holds a Bolt-style composable, written with no idea loom exists, and the `composableSource({ … })` that plugs it in, declaring its `fields` so widgets can bind to them (`"reading.label"`, `"actions.toggleSave"`).

```ts
export function useReading(props: { story: Story }) { … }        // the composable
export const readingSource = composableSource({ // the source
  id: 'reading',
  fields: { label: { type: 'string' }, progress: { type: 'number' } },
  use: useReading,
})
```

| File          | Gives widgets                                                             |
| ------------- | ------------------------------------------------------------------------- |
| `shared.js`   | Not a source: `composableSource`, `storyProps`, `imageUrl`, `STORY_ITEM`. |
| `story.js`    | Headline, summary, section, byline, image, link, saved, read, locked      |
| `time.js`     | "2 hours ago", the full date, published in the last hour                  |
| `reading.js`  | "6 min read", percent read                                                |
| `labels.js`   | Breaking, exclusive, opinion, sponsored, and the one to show              |
| `topic.js`    | The topic, whether it's followed, follow or unfollow (through the bridge) |
| `related.js`  | Related stories from the feed                                             |
| `actions.js`  | Open, save, share (through the bridge)                                    |
| `event.js`    | Date, day and month, place, add to calendar (through the bridge)          |
| `video.js`    | A playable URL for every Bolt video platform, poster, running time        |
| `gallery.js`  | Photos with captions, "6 photos"                                          |
| `podcast.js`  | Show, length, artwork, play or pause in the native player                 |
| `live.js`     | Live or ended, posts newest first, "Updated 4 minutes ago"                |
| `quote.js`    | The quote and who said it                                                 |
| `timeline.js` | Which timeline the widget is in                                           |
| `index.js`    | `timelineSources`, in the order editors list them, and every composable.  |

## Technically

- `composableSource` calls the composable with `{ story, index }` as getters over loom's source context (`storyProps`), so its `computed`s react when the story changes, and `fields` should list what it returns: a field it doesn't return binds to nothing.
- Composables that act take the bridge as their second argument (`ctx.context`). They never decide paywalls: the kit's guard (`../paywall.js`) does, for every action at once.
- A source is set up the first time a widget reads it, inside that widget's scope, so it stops when the widget unmounts.
