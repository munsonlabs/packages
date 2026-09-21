export interface Short {
  id: string
  src: string
  poster: string
  handle: string
  title: string
  likes: string
  comments: string
}

export interface ShortsPage {
  items: Short[]
  next: number | null
}

/** Static JSON under `public/shorts/` stands in for a paginated API: each page names the next, and the last says `null`. */
export async function fetchShorts(baseURL: string, page: number): Promise<ShortsPage> {
  const res = await fetch(`${baseURL}shorts/page-${page}.json`)
  if (!res.ok) throw new Error(`shorts page ${page}: ${res.status}`)
  return res.json()
}
