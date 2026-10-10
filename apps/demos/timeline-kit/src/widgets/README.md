# `widgets/`: the example widgets

One JSON file per widget: exactly what an editor edits and a library bundles. Nothing here is code.

| File                | `entry.type`  | Variants                                            |
| ------------------- | ------------- | --------------------------------------------------- |
| `article-card.json` | `article`     | Breaking (red, no image), Subscribers only, Compact |
| `event-card.json`   | `event`       | Compact                                             |
| `video-tile.json`   | any video one | None; always dark (`fixedColors`)                   |
| `gallery-card.json` | `gallery`     | Compact                                             |
| `podcast-row.json`  | `podcast`     | Playing                                             |
| `live-blog.json`    | `liveblog`    | Ended, Compact                                      |
| `pull-quote.json`   | `quote`       | None                                                |
| `index.js`          |               | `widgets`: all of them, in library order            |

## Technically

- Each says which stories it's for in `match` (Bolt picks by `entry.type`, and so do these), and which sources it binds to in `uses`.
- They must validate against the kit: `test/kit.spec.js` checks every one, and the feed demo's bundled library is built from them (its test fails if they drift).
