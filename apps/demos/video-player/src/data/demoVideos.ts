import type { VideoEntry } from '@munsonlabs/video-player'

// Google's official IMA sample ad tags (developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags)
const AD_VAST =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator='
const AD_SKIP =
  'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator='
const AD_VMAP =
  'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpost&cmsid=496&vid=short_onecue&correlator='
const AD_VMAP_POD =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator='
const AD_VMAP_OPTIMIZED_POD =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostoptimizedpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator='
const AD_VMAP_BUMPER_POD =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostpodbumper&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator='
const AD_VMAP_LONG_POD =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostlongpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator='
const AD_VMAP_SKIP_POD =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_skip_ad_samples&sz=640x480&cust_params=sample_ar%3Dmidskiponly&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator='

export const videos: VideoEntry[] = [
  {
    title: ' Oh my gah!',
    src: 'https://www.youtube.com/watch?v=UnktCDi-BVs',
    poster: 'https://img.youtube.com/vi/UnktCDi-BVs/0.jpg',
  },
  {
    title: 'Stranger than Heaven',
    src: 'https://www.youtube.com/shorts/OkPttXeT8WY?si=YJTdQ1WqlJi9wVCG',
    poster: 'https://img.youtube.com/vi/OkPttXeT8WY/0.jpg',
    aspectRatio: '9:16',
  },
  {
    title: 'Dailymotion demo video',
    src: 'https://www.dailymotion.com/video/x84sh87',
    poster: 'https://www.dailymotion.com/thumbnail/video/x84sh87',
  },
  {
    title: 'Tears of Steel',
    src: 'https://vimeo.com/347119375',
    poster: 'https://vumbnail.com/347119375.jpg',
  },
  {
    title: 'Big Buck Bunny',
    src: 'https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4',
    adTagUrl: AD_VAST,
    poster: 'https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg',
  },
  {
    // Apple's official HLS test stream — exercises the hls.js path in non-Safari browsers and
    // native HLS in Safari, since none of the other entries above are adaptive streams.
    title: 'HLS test stream (bipbop)',
    src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
  },
  {
    // Akamai's public live HLS test stream — actually live (infinite duration), exercising the
    // player's isLive path (live badge, hidden seek bar, suppressed position-memory/quartiles).
    title: 'Live HLS test stream (Akamai)',
    src: 'https://hls-harbor-livepush.akamaized.net/live_cdn/nsqIStpj8PaG-Ev/emcQJ0pGpremocy/index.m3u8',
    poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
  },
  {
    // Akamai's public MPEG-DASH test stream (dash.js's own reference demo asset) — exercises the
    // dash.js path (adaptive bitrate + quality switching over a .mpd manifest).
    title: 'DASH test stream (bbb_30fps)',
    src: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
  },
  {
    // Proves out the registerMatcher/registerEmbedAdapter extensibility API (see
    // src/adapters/cloudflareAdapter.ts) - Cloudflare Stream isn't a platform the library itself
    // knows about. A public, no-signup Cloudflare Stream demo video.
    title: 'Cloudflare Stream (third-party adapter demo)',
    src: 'https://customer-f33zs165nr7gyfy4.cloudflarestream.com/6b9e68b07dfee8cc2d116e4c51d6a957/iframe',
    poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
  },
]

const BBB_URL = 'https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4'
const BBB_POSTER = 'https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg'

// Every entry plays the same underlying file — the URL fragment is never sent in the actual
// request (browsers strip it before fetching), it's just here so each entry has a distinct
// src for the demo's identity-sensitive bits (save-button state, event-log title lookup,
// the "click again toggles play" check).
const adVideo = (fragment: string, title: string, adTagUrl: string): VideoEntry => ({
  title,
  src: `${BBB_URL}#${fragment}`,
  poster: BBB_POSTER,
  adTagUrl,
})

// Prebid's own documented test config for video instream (AppNexus placement 13232361).
const headerBiddingAdUnit = {
  code: 'video-instream-demo',
  mediaTypes: {
    video: { context: 'instream', playerSize: [640, 480], mimes: ['video/mp4'], protocols: [1, 2, 3, 4, 5, 6, 7, 8], playbackmethod: [2], skip: 1 },
  },
  bids: [{ bidder: 'appnexus', params: { placementId: 13232361, video: { skippable: true, playback_methods: ['auto_play_sound_off'] } } }],
}

export const adVideos: VideoEntry[] = [
  adVideo('vast-preroll', 'VAST — single linear pre-roll', AD_VAST),
  adVideo('vast-skip', 'VAST — single skippable pre-roll', AD_SKIP),
  adVideo('vmap', 'VMAP — pre/mid/post-roll (single ad each)', AD_VMAP),
  adVideo('vmap-pod', 'VMAP — pre/mid/post-roll (3-ad pod)', AD_VMAP_POD),
  adVideo('vmap-optimized-pod', 'VMAP — pre/mid/post-roll (3-ad optimized pod)', AD_VMAP_OPTIMIZED_POD),
  adVideo('vmap-bumper-pod', 'VMAP — pre/mid/post-roll with bumpers (3-ad pod)', AD_VMAP_BUMPER_POD),
  adVideo('vmap-long-pod', 'VMAP — long pod (5 ads, mid-roll)', AD_VMAP_LONG_POD),
  adVideo('vmap-skip-pod', 'VMAP — 2 skippable ads (mid-roll)', AD_VMAP_SKIP_POD),
]

export const prebidVideos: VideoEntry[] = [
  {
    ...adVideo('header-bidding', 'Header bidding (Prebid.js test auction)', AD_VAST),
    // sample_ct=linear selects which sample creative this shared demo ad unit serves.
    headerBidding: {
      adUnit: headerBiddingAdUnit,
      params: { iu: '/21775744923/external/single_ad_samples', cust_params: 'sample_ct=linear' },
      timeoutMs: 2000,
    },
  },
]

export const captionVideos: VideoEntry[] = [
  {
    title: 'Big Buck Bunny (English + French captions)',
    src: `${BBB_URL}#captions`,
    poster: BBB_POSTER,
    tracks: [
      { src: '/captions/bbb-en.vtt', kind: 'captions', srclang: 'en', label: 'English', default: true },
      { src: '/captions/bbb-fr.vtt', kind: 'captions', srclang: 'fr', label: 'Français' },
    ],
  },
]

// Same URL as the "HLS test stream (bipbop)" entry in Videos above — its manifest genuinely
// declares 8 resolution variants (480p through 1080p), which hls.js/Safari expose automatically
// with no extra props needed at all, same "auto-detected" shape as HLS-embedded captions.
export const qualityVideos: VideoEntry[] = [
  {
    title: 'HLS test stream (bipbop) — adaptive bitrate',
    // The #quality fragment is stripped before the actual request (same trick as adVideo above)
    // — it only exists so the event log can tell this card's plays apart from the Videos panel's
    // otherwise-identical entry for the same underlying stream.
    src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8#quality',
  },
]
