# `widgets/`: the example widgets

One JSON file per widget: exactly what an editor edits and a library bundles. Nothing here is code.

| File                | Kind      | Variants                                            |
| ------------------- | --------- | --------------------------------------------------- |
| `article-card.json` | `article` | Breaking (red, no image), Subscribers only, Compact |
| `event-card.json`   | `event`   | Compact                                             |
| `video-tile.json`   | `video`   | None; always dark (`fixedColors`)                   |
| `gallery-card.json` | `gallery` | Compact                                             |
| `podcast-row.json`  | `podcast` | Playing                                             |
| `live-blog.json`    | `live`    | Ended, Compact                                      |
| `pull-quote.json`   | `quote`   | None                                                |
| `index.js`          |           | `widgets`: all of them, in library order            |

## Technically

- Each kind in `../kinds.js` starts new widgets from its file here, so editing an example changes what `createDefinition` starts from.
- They must validate against the kit: `test/kit.spec.js` checks every one.
