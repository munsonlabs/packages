---
'@munsonlabs/video-player': patch
---

A `playInView` player now reads `muted` when it scrolls into view rather than when it mounted, so unmuting a preloaded player before it is reached no longer has it start muted.
