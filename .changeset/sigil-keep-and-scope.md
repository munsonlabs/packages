---
'@munsonlabs/sigil': patch
---

Added `keepLibrary()`, which re-registers a library whenever it goes missing so `unregister(name)` means "restore the default" rather than "gone for good". `override(name, icon, { library })` now also scopes a pin to one library, so it can't collide with another library's icon of the same name.
