# `preview/`: how the widget is previewed

Settings for looking at the widget, none of which are saved in it.

| File            | What it does                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `usePreview.js` | The sample data (only those the widget matches), the width, the theme, and whether variant rules pick the variant (**Rules**). |

## Technically

- With **Rules** off, the preview pins the variant being edited. With it on, `<Widget>` picks one from its rules and reports it back (`matchedVariant`), exactly as an app would.
- Tests: `test/preview/`.
