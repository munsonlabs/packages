# @munsonlabs/sigil

## 0.0.3

### Patch Changes

- aa7a31e: The custom element is now `<ml-sigil-icon>`, so it no longer shares a prefix with other `@munsonlabs` packages.

## 0.0.2

### Patch Changes

- fcc4728: Added `keepLibrary()`, which re-registers a library whenever it goes missing so `unregister(name)` means "restore the default" rather than "gone for good". `override(name, icon, { library })` now also scopes a pin to one library, so it can't collide with another library's icon of the same name.

## 0.0.1

### Patch Changes

- 6ef37f1: Initial release: a framework-free icon registry with a `<ml-sigil>` custom element and a Vue `<Sigil>` component. Register icon libraries (SVGs, JSON, icon fonts, or your own source), switch between them with `use()`, and pin exceptions with `override()`.
