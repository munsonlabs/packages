# `definitions/`: working with a widget's JSON

Everything that reads a definition, apart from drawing it. `<Widget>` uses these to render.

| File          | What it does                                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.js`    | Bindings: splits `"product.title"` into source and keys and reads it (unwrapping Vue refs); `item` and `repeat` are the current item and its position inside a Repeat. |
| `validate.js` | `parseAction` reads an action binding, whichever form it was written in: `"shop.open"` or `{ action, arg }`.                                                           |
