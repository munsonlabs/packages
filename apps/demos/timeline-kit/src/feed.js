const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()
const hoursAgo = (h) => minutesAgo(h * 60)
const daysFromNow = (days, hour) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const photo = (seed, caption) => ({ src: `https://picsum.photos/seed/${seed}/800/600`, caption, credit: 'Picsum' })

/**
 * The stories the (stub) native app has downloaded, in Bolt's story shape, with something for every kind: articles (breaking, part-read,
 * paywalled, opinion, one with related stories), an event, two videos, a gallery, a members-only podcast, a
 * live blog and a quote, plus one story with no type, which no widget renders.
 */
export const stories = [
  {
    entry: {
      id: 'rail-strike',
      type: 'article',
      breaking: true,
      title: 'Rail strike called off after late-night talks',
      summary: 'Unions accepted a revised offer just after 2am. Services will run as normal from first thing.',
      section: 'Transport',
      published: minutesAgo(12),
      readtime: 2,
    },
  },
  {
    entry: {
      id: 'harbour',
      type: 'article',
      title: 'Harbour redevelopment clears its final planning hurdle',
      summary: 'Councillors approved the scheme 9–2 after a six-hour meeting, ending a decade of delays over the waterfront site.',
      section: 'City',
      topic: 'Harbour scheme',
      author: 'Ada Lovell',
      authorHeadshot: 'https://picsum.photos/seed/ada/96/96',
      published: hoursAgo(2),
      readtime: 6,
      url: 'https://example.com/harbour',
      images: [photo('harbour')],
      children: ['harbour-history', 'harbour-reaction'],
    },
    progress: 0.35,
  },
  {
    entry: {
      id: 'storm-live',
      type: 'liveblog',
      live: true,
      title: 'Storm Agnes: gusts of 70mph expected as warnings extended',
      section: 'Weather',
      published: hoursAgo(3),
      updates: [
        { time: minutesAgo(4), text: 'The Met Office has extended its amber warning to cover the whole coast until 9pm.' },
        { time: minutesAgo(22), text: 'Ferries from the north harbour are cancelled for the rest of the day.' },
        { time: minutesAgo(51), text: 'Schools in three districts will close at lunchtime, the council says.' },
        { time: minutesAgo(95), text: 'Good morning, and welcome to our live coverage of Storm Agnes.' },
      ],
    },
  },
  {
    entry: {
      id: 'coast-gallery',
      type: 'gallery',
      title: 'In pictures: the coast after the storm',
      section: 'Photography',
      published: hoursAgo(5),
      images: [
        photo('coast-1', 'Waves over the sea wall at first light'),
        photo('coast-2', 'Clearing sand from the promenade'),
        photo('coast-3', 'The pier, closed until further notice'),
        photo('coast-4', 'Fishing boats sheltering in the inner harbour'),
        photo('coast-5', 'Volunteers checking the dunes'),
        photo('coast-6', 'Calm again by evening'),
      ],
    },
  },
  {
    entry: {
      id: 'morning-brief',
      type: 'podcast',
      title: 'Why the harbour vote took ten years',
      show: 'The Morning Brief',
      paywall_locked: true,
      duration: '24 min',
      published: hoursAgo(6),
      audiourl: 'https://example.com/morning-brief.mp3',
      images: [{ src: 'https://picsum.photos/seed/microphone/400/400' }],
    },
  },
  {
    entry: {
      id: 'open-studios',
      type: 'event',
      title: 'Open studios weekend at the Old Mill',
      summary: 'Forty artists open their workshops to the public, with talks, demos and a late bar on Saturday.',
      section: "What's on",
      startdate: daysFromNow(9, 10),
      enddate: daysFromNow(10, 18),
      location: 'The Old Mill, Canal Street',
      externalurl: 'https://example.com/open-studios',
      images: [photo('studio')],
    },
  },
  {
    entry: {
      id: 'mayor-quote',
      type: 'quote',
      quote: 'We waited a decade for this. Now we have to build something the whole city can use.',
      quote_author: 'Rosa Mensah',
      quote_role: 'Mayor',
      topic: 'Harbour scheme',
      section: 'City',
    },
  },
  {
    entry: {
      id: 'tide-clip',
      type: 'video',
      title: 'Watch: the king tide floods the promenade',
      section: 'Video',
      published: hoursAgo(4),
      duration: '0:46',
      videourl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      images: [photo('tide')],
    },
  },
  {
    entry: {
      id: 'orchestra',
      type: 'article',
      title: 'The orchestra that rehearses in a car park',
      summary: 'Every Sunday at dawn, forty musicians set up on level four. Nobody remembers who started it.',
      section: 'Culture',
      author: 'Ines Okafor',
      published: hoursAgo(30),
      readtime: 11,
      paywall_locked: true,
      images: [photo('orchestra')],
    },
  },
  {
    entry: {
      id: 'cycle-lanes',
      type: 'article',
      opinion: true,
      title: 'Cycle lanes aren’t a war on drivers. They’re a truce',
      summary: 'Every bike on the road is a car that isn’t. It’s time the debate caught up.',
      section: 'Comment',
      author: 'Tom Achebe',
      published: hoursAgo(20),
      readtime: 5,
    },
  },
  {
    entry: {
      id: 'youtube-explainer',
      type: 'youtube',
      title: 'Explained: why the tides are getting higher',
      section: 'Video',
      published: hoursAgo(26),
      duration: '3:12',
      videoid: 'aqz-KE-bpKQ',
      images: [photo('explainer')],
    },
  },
  {
    entry: { id: 'untyped', title: 'A story with no type renders no widget, as in Bolt' },
  },
  // Related stories: shown inside the harbour story, not in the feed.
  {
    entry: {
      id: 'harbour-history',
      type: 'article',
      title: 'Ten years, four plans: how the harbour scheme got here',
      section: 'City',
      published: hoursAgo(5),
      images: [photo('docks')],
    },
  },
  {
    entry: {
      id: 'harbour-reaction',
      type: 'article',
      title: 'Residents split over what the decision means for rents',
      section: 'City',
      published: hoursAgo(3),
      images: [photo('street')],
    },
  },
]

/** The stories a timeline shows: everything but the ones that only appear as another story's related. */
export const feedOf = (all) => all.filter((story) => !all.some((s) => s.entry.children?.includes(story.entry.id)))
