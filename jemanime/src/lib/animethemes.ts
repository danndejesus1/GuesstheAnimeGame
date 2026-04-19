export type Round = {
  id: number
  mode: 'Character' | 'Opening'
  answer: string
  themeType: string
  sequence: number | null
  videoUrl?: string
}

export type OpeningGameData = {
  rounds: Round[]
  titleSuggestions: string[]
}

type ApiVideo = {
  basename: string
  link?: string
}

type ApiThemeEntry = {
  animetheme?: ApiTheme
  videos?: ApiVideo[]
}

type ApiTheme = {
  type: string
  sequence: number | null
  animethemeentries?: ApiThemeEntry[]
}

type ApiAnime = {
  name: string
  animethemes?: ApiTheme[]
}

type AnimeIndexResponse = {
  anime: ApiAnime[]
  links?: {
    next?: string | null
  }
}

const API_BASE_URL = 'https://api.animethemes.moe'
const VIDEO_BASE_URL = 'https://v.animethemes.moe'
const PAGE_SIZE = 100
const MAX_RANDOM_PAGE = 500
const MAX_TITLE_PAGES = 500
const REQUEST_TIMEOUT_MS = 12000
const TITLES_CACHE_KEY = 'jemanime:all-title-suggestions:v2'
const TITLES_CACHE_TTL_MS = 1000 * 60 * 60 * 24

type RoundCandidate = {
  animeName: string
  themeType: string
  sequence: number | null
  videoUrl?: string
}

type CacheEnvelope<T> = {
  expiresAt: number
  data: T
}

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const sample = <T,>(items: T[], count: number): T[] => {
  if (items.length <= count) return items
  return shuffle(items).slice(0, count)
}

const getLocalStorage = (): Storage | null => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null
  return globalThis.localStorage
}

const readCache = <T,>(key: string): T | null => {
  const storage = getLocalStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CacheEnvelope<T>
    if (Date.now() > parsed.expiresAt) {
      storage.removeItem(key)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

const writeCache = <T,>(key: string, data: T, ttlMs: number): void => {
  const storage = getLocalStorage()
  if (!storage) return

  const payload: CacheEnvelope<T> = {
    expiresAt: Date.now() + ttlMs,
    data,
  }

  try {
    storage.setItem(key, JSON.stringify(payload))
  } catch {
    // no-op
  }
}


async function fetchAnimePage(pageNumber: number): Promise<ApiAnime[]> {
  const params = new URLSearchParams({
    include: 'animethemes.animethemeentries.videos',
    'filter[has]': 'animethemes.animethemeentries.videos',
    'page[size]': String(PAGE_SIZE),
    'page[number]': String(pageNumber),
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const response = await fetch(`${API_BASE_URL}/anime?${params.toString()}`, {
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    throw new Error(`AnimeThemes API request failed at page ${pageNumber} with status ${response.status}.`)
  }

  const json = (await response.json()) as AnimeIndexResponse
  return json.anime ?? []
}

async function fetchAnimeTitlePage(pageNumber: number): Promise<AnimeIndexResponse> {
  const params = new URLSearchParams({
    'fields[anime]': 'name',
    'page[size]': String(PAGE_SIZE),
    'page[number]': String(pageNumber),
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const response = await fetch(`${API_BASE_URL}/anime?${params.toString()}`, {
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    throw new Error(`AnimeThemes title request failed at page ${pageNumber} with status ${response.status}.`)
  }

  return (await response.json()) as AnimeIndexResponse
}

async function fetchAnimeTitlePageWithRetry(pageNumber: number, retries = 2): Promise<AnimeIndexResponse | null> {
  let attempt = 0

  while (attempt <= retries) {
    try {
      return await fetchAnimeTitlePage(pageNumber)
    } catch {
      attempt += 1
    }
  }

  return null
}

function isOpeningOrEnding(theme: ApiTheme): boolean {
  return theme.type === 'OP' || theme.type === 'ED'
}

function toCandidate(animeName: string, theme: ApiTheme, video: ApiVideo): RoundCandidate {
  return {
    animeName,
    themeType: theme.type,
    sequence: theme.sequence,
    videoUrl: video.link ?? `${VIDEO_BASE_URL}/${video.basename}`,
  }
}

function parseResolution(video: ApiVideo): number | null {
  const target = `${video.link ?? ''} ${video.basename ?? ''}`.toLowerCase()
  const withP = /(\d{3,4})p/.exec(target)
  if (withP?.[1]) {
    return Number(withP[1])
  }

  const plain = /(?:^|[^\d])(\d{3,4})(?:[^\d]|$)/.exec(target)
  if (plain?.[1]) {
    return Number(plain[1])
  }

  return null
}

function getResolutionScore(resolution: number | null): number {
  if (resolution === 480) return 0
  if (resolution !== null && resolution < 480) return 100 + (480 - resolution)
  if (resolution !== null && resolution > 480) return 1000 + (resolution - 480)
  return 5000
}

function pickPreferredVideo(videos: ApiVideo[]): ApiVideo | null {
  if (videos.length === 0) return null

  let bestVideo: ApiVideo | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const video of videos) {
    const score = getResolutionScore(parseResolution(video))
    if (score < bestScore) {
      bestScore = score
      bestVideo = video
    }
  }

  return bestVideo
}

function collectThemeVideos(theme: ApiTheme): ApiVideo[] {
  const videos: ApiVideo[] = []

  for (const entry of theme.animethemeentries ?? []) {
    const entryVideos: ApiVideo[] = []
    for (const video of entry.videos ?? []) {
      if (!video.link && !video.basename) continue
      entryVideos.push(video)
    }

    const preferred = pickPreferredVideo(entryVideos)
    if (preferred) {
      videos.push(preferred)
    }
  }

  return videos
}

function buildCandidatesForAnime(item: ApiAnime): RoundCandidate[] {
  const candidates: RoundCandidate[] = []

  for (const theme of item.animethemes ?? []) {
    if (!isOpeningOrEnding(theme)) continue

    const videos = collectThemeVideos(theme)
    for (const video of videos) {
      candidates.push(toCandidate(item.name, theme, video))
    }
  }

  return candidates
}

function buildRoundCandidates(anime: ApiAnime[]): RoundCandidate[] {
  return anime.flatMap((item) => buildCandidatesForAnime(item))
}

async function fetchCandidatesWithSuggestions(): Promise<{ candidates: RoundCandidate[]; suggestions: string[] }> {
  const attempts = 12
  const usedPages = new Set<number>()

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let pageNumber = Math.floor(Math.random() * MAX_RANDOM_PAGE) + 1
    while (usedPages.has(pageNumber) && usedPages.size < MAX_RANDOM_PAGE) {
      pageNumber = Math.floor(Math.random() * MAX_RANDOM_PAGE) + 1
    }

    usedPages.add(pageNumber)

    const anime = await fetchAnimePage(pageNumber)
    const candidates = buildRoundCandidates(anime)
    const suggestions = Array.from(new Set(anime.map((item) => item.name))).sort((a, b) => a.localeCompare(b))

    if (candidates.length > 0) {
      return { candidates, suggestions }
    }
  }

  throw new Error('AnimeThemes returned no playable candidates in sampled pages.')
}

export async function fetchAnimeThemesOpeningRounds(roundCount = 8): Promise<OpeningGameData> {
  const { candidates, suggestions } = await fetchCandidatesWithSuggestions()

  const selected = sample(shuffle(candidates), roundCount)

  const rounds = selected.map((item, index) => {
    return {
      id: index + 1,
      mode: 'Opening' as const,
      answer: item.animeName,
      themeType: item.themeType,
      sequence: item.sequence,
      videoUrl: item.videoUrl,
    }
  })

  return {
    rounds,
    titleSuggestions: suggestions,
  }
}

export async function fetchAllAnimeTitleSuggestions(): Promise<string[]> {
  const cached = readCache<string[]>(TITLES_CACHE_KEY)
  if (cached && cached.length > 0) {
    return cached
  }

  const names = new Set<string>()
  let pageNumber = 1
  let hasNext = true
  let consecutiveFailures = 0

  while (hasNext && pageNumber <= MAX_TITLE_PAGES) {
    const page = await fetchAnimeTitlePageWithRetry(pageNumber)

    if (!page) {
      consecutiveFailures += 1
      if (consecutiveFailures >= 5) {
        break
      }

      pageNumber += 1
      continue
    }

    consecutiveFailures = 0

    for (const anime of page.anime ?? []) {
      if (anime.name) {
        names.add(anime.name)
      }
    }

    hasNext = Boolean(page.links?.next)
    pageNumber += 1
  }

  const suggestions = Array.from(names).sort((a, b) => a.localeCompare(b))

  if (suggestions.length > PAGE_SIZE) {
    writeCache(TITLES_CACHE_KEY, suggestions, TITLES_CACHE_TTL_MS)
  }

  return suggestions
}
