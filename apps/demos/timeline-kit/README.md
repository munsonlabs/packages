# timeline-kit

Bolt's story timeline as a [loom](../../../packages/loom) kit, shared by the [studio](../loom-studio) and [feed](../loom-feed) demos. Its context is the Bolt bridge (here [`bolt-bridge-stub`](../bolt-bridge-stub)): every action a widget takes goes through the bridge to the native app, and comes back as state.

```
src/
  types.js     Story (the data) and TimelineHost (the context: the bridge)
  sources/     one file per composable, its loom source beside it
  widgets/     one JSON file per example widget, in library order, each saying which entry.type it's for
  paywall.js   the kit's guard: any action on a locked story shows the native paywall instead
  themes.js    light and dark, reading a publisher's --timeline-style-* variables
  icons.js     registerIcons: the Lucide icons the widgets name
  feed.js      sample stories, as the native app would send them: something for every widget
  index.js     timelineKit
vite.js        loomFromSource: aliases that run loom from source in the demos
```

| Source     | Gives widgets                                                  |
| ---------- | -------------------------------------------------------------- |
| `story`    | Headline, summary, section, byline, image, saved/read/locked   |
| `time`     | "2 hours ago", the full date, published in the last hour       |
| `reading`  | "6 min read", percent read                                     |
| `labels`   | Breaking, exclusive, opinion, sponsored, and the one to show   |
| `topic`    | The topic, whether it's followed, follow/unfollow              |
| `related`  | Related stories from the feed                                  |
| `actions`  | Open (this story or another), save, share                      |
| `event`    | Date, day and month for a tile, place, add to calendar         |
| `video`    | A playable URL for every Bolt video platform, poster, duration |
| `gallery`  | Photos with captions, "6 photos"                               |
| `podcast`  | Show, duration, artwork, play/pause                            |
| `live`     | Live or ended, posts newest first, "Updated 4 minutes ago"     |
| `quote`    | The quote, who said it                                         |
| `timeline` | Which timeline the widget is in                                |

Widgets: article card, event card, video tile, gallery card, podcast row, live blog and pull quote, each with the variants its data or width calls for.

```bash
vp run --filter timeline-kit test
```
