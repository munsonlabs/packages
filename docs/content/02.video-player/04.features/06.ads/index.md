---
title: Ads & monetisation
description: IMA (VAST/VMAP) ads, ad macro params, and header bidding.
navigation:
  icon: i-lucide:megaphone
---

Ads run through **Google IMA** on the native `<video>` path - MP4/HLS/DASH, plus Brightcove and JW Player. Not supported on YouTube, Vimeo, or Dailymotion, which play their own ads inside their iframe.

## VAST / VMAP

Pass an ad tag as `adTagUrl`; the IMA SDK loads on demand, nothing else to configure:

::tabs
:::tabs-item{label="Vue" icon="i-vscode-icons:file-type-vue"}

```vue
<VideoCard
  src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4"
  ad-tag-url="https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&gdfp_req=1&output=vast&env=vp&impl=s&correlator="
/>
```

:::
:::tabs-item{label="Web component" icon="i-vscode-icons:file-type-html"}

```html
<ml-video-card
  src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4"
  ad-tag-url="https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&amp;sz=640x480&amp;cust_params=sample_ct%3Dlinear&amp;gdfp_req=1&amp;output=vast&amp;env=vp&amp;impl=s&amp;correlator="
></ml-video-card>
```

Ad tags are query-string heavy - escape the `&` as `&amp;` in HTML, or the browser will eat the parameters.
:::
::

::player-example{src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4" label="Big Buck Bunny" poster="https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg" ad-tag-url="https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&gdfp_req=1&output=vast&env=vp&impl=s&correlator=" caption="Live pre-roll against Google's public IMA sample tag. Press play - the ad overlay, countdown and independent ad mute are all real."}
::

The same endpoint serves **VMAP** (`output=vmap`) for pre/mid/post-roll schedules, including multi-ad pods and bumpers. Confirm playback via `adstart`/`adend` on `state-change`.

While an ad plays, an overlay shows an "Ad" badge with a countdown, a pause/resume button, and a mute button for the **ad creative's own audio** - independent of the content video's volume, in both directions.

## Ad macros & auto-discovered tags

A Brightcove source auto-discovers its own ad tag when you don't pass `adTagUrl`, and those tags are usually macro _templates_ (`...&iu={adUnit}&vid={referenceId}`). `adMacroParams` fills `{macro}` tokens in whichever tag ends up in use, prop-supplied or discovered:

```vue
<VideoCard src="https://players.brightcove.net/..." :ad-macro-params="{ adUnit: 'network/section', referenceId: videoId }" />
```

Name each key after the macro it fills (`vid={referenceId}` → key `referenceId`, not `vid`). A key with no matching macro is a no-op.
