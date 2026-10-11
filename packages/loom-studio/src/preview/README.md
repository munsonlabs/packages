# `preview/`: how the widget is previewed

Settings for looking at the widget, none of which are saved in it, and the log of what it asks of the app.

| File            | What it does                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `usePreview.js` | The sample data (only those the widget matches), the width, the theme and light or dark, whether variant rules pick the variant (**Rules**), and edit or Try mode (`mode`).                            |
| `frames.js`     | The frames the canvas can show side by side (`frameModes`), and `framesFor(mode, preview)`: the current preview with one setting changed per frame, the matching one marked as the frame being edited. |
| `useCallLog.js` | Wraps the app's context so every function a widget calls on it is logged and toasted, and still runs.                                                                                                  |
| `logCalls.js`   | The wrapper itself: a Proxy that reports a call at any depth (`cart.add`) and passes values through untouched.                                                                                         |

## Technically

- With **Rules** off, the preview pins the variant being edited. With it on, `<Widget>` picks one from its rules and reports it back (`matchedVariant`), exactly as an app would.
- Frames are worked out in `studio.js` (`frames`, `focusFrame`). Clicking into a frame that isn't the one being edited first gives the preview that frame's width, variant, sample or scheme, so the bottom bar and the frames always agree.
- A theme that another names as its dark partner isn't listed; the light/dark switch reaches it (`themeForScheme` from loom).
- Tests: `test/preview/`.
