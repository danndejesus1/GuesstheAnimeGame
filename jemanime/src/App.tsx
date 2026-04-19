import { useEffect, useMemo, useState } from 'react'
import { MediaPanel } from './components/MediaPanel'
import { MAX_LIVES, REVEAL_STAGES } from './game/revealStages'
import { filterTitleSuggestions, mergeAndSortTitles, sortTitles } from './game/titleUtils'
import { fetchAllAnimeTitleSuggestions, fetchAnimeThemesOpeningRounds, type Round } from './lib/animethemes'

function App() {
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [guessInput, setGuessInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [loadingApiRounds, setLoadingApiRounds] = useState(true)
  const [loadingNextRound, setLoadingNextRound] = useState(false)
  const [prefetchingNextRound, setPrefetchingNextRound] = useState(false)
  const [prefetchedRound, setPrefetchedRound] = useState<Round | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [apiMessage, setApiMessage] = useState('Loading one random opening from AnimeThemes API...')
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | 'out' | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadInitialRound = async () => {
      try {
        const liveData = await fetchAnimeThemesOpeningRounds(1)
        const firstRound = liveData.rounds[0]

        if (cancelled) return

        if (firstRound) {
          setCurrentRound(firstRound)
          setTitleSuggestions(sortTitles(Array.from(new Set(liveData.titleSuggestions))))
          setPrefetchedRound(null)
          setRoundNumber(1)
          setGuessInput('')
          setShowSuggestions(false)
          setRevealed(false)
          setScore(0)
          setLives(MAX_LIVES)
          setLastResult(null)
          setLoadError(null)
          
        } else {
          setLoadError('AnimeThemes returned no playable rounds. Try again.')
       
        }
      } catch {
        if (!cancelled) {
          setLoadError('Unable to load AnimeThemes API. Check your network and try again.')
        
        }
      } finally {
        if (!cancelled) {
          setLoadingApiRounds(false)
        }
      }
    }

    loadInitialRound()

    fetchAllAnimeTitleSuggestions()
      .then((allTitles) => {
        if (cancelled || allTitles.length === 0) return
        setTitleSuggestions(allTitles)
      })
      .catch(() => {
        // keep partial in-memory suggestions if full list fetch fails
      })

    return () => {
      cancelled = true
    }
  }, [])

  const normalizedGuess = guessInput.trim().toLowerCase()
  const isCorrect = currentRound ? normalizedGuess === currentRound.answer.trim().toLowerCase() : false
  const stageIndex = MAX_LIVES - lives
  const stage = REVEAL_STAGES[Math.min(Math.max(stageIndex, 0), REVEAL_STAGES.length - 1)]
  const revealVideoFully = revealed && lastResult === 'correct'

  const progress = useMemo(() => 100, [])

  const filteredSuggestions = useMemo(() => {
    return filterTitleSuggestions(titleSuggestions, guessInput)
  }, [guessInput, titleSuggestions])

  useEffect(() => {
    if (!currentRound || loadingNextRound || prefetchingNextRound || prefetchedRound) return

    let cancelled = false
    setPrefetchingNextRound(true)

    fetchAnimeThemesOpeningRounds(1)
      .then((liveData) => {
        if (cancelled) return

        const next = liveData.rounds[0]
        if (!next) return

        setPrefetchedRound(next)
        setTitleSuggestions((prev) => mergeAndSortTitles(prev, liveData.titleSuggestions))
      })
      .catch(() => {
        // silent; next round button path still fetches directly
      })
      .finally(() => {
        if (!cancelled) {
          setPrefetchingNextRound(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentRound, loadingNextRound, prefetchingNextRound, prefetchedRound])

  if (loadingApiRounds) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-violet-300/20 bg-zinc-950/60 p-6 text-zinc-300">
          Fetching one random opening...
        </section>
      </main>
    )
  }

  if (loadError || !currentRound) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-rose-300/20 bg-zinc-950/60 p-6">
          <h1 className="text-xl font-bold text-rose-200">Could not start game rounds</h1>
          <p className="mt-2 text-sm text-zinc-300">{loadError ?? 'No rounds available.'}</p>
          <button
            type="button"
            onClick={() => globalThis.location.reload()}
            className="mt-4 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400"
          >
            Retry
          </button>
        </section>
      </main>
    )
  }

  const submitGuess = () => {
    if (!guessInput.trim() || revealed) return

    if (isCorrect) {
      setScore((prev) => prev + lives)
      setRevealed(true)
      setLastResult('correct')
      return
    }

    const nextLives = Math.max(0, lives - 1)
    setLives(nextLives)
    setGuessInput('')

    if (nextLives === 0) {
      setRevealed(true)
      setLastResult('out')
      return
    }

    setLastResult('wrong')
  }

  const revealMore = () => {
    if (revealed || lives <= 0) return

    const nextLives = Math.max(0, lives - 1)
    setLives(nextLives)

    if (nextLives === 0) {
      setRevealed(true)
      setLastResult('out')
    }
  }

  const nextRound = () => {
    if (!revealed) return

    if (prefetchedRound) {
      setCurrentRound(prefetchedRound)
      setPrefetchedRound(null)
      setRoundNumber((prev) => prev + 1)
      setGuessInput('')
      setShowSuggestions(false)
      setRevealed(false)
      setLastResult(null)
      setLives(MAX_LIVES)
      setApiMessage('Loaded prefetched opening from AnimeThemes API')
      return
    }

    setLoadingNextRound(true)
    setLoadError(null)

    fetchAnimeThemesOpeningRounds(1)
      .then((liveData) => {
        const next = liveData.rounds[0]
        if (!next) {
          setLoadError('AnimeThemes returned no playable rounds. Try again.')
          return
        }

        setCurrentRound(next)
        setTitleSuggestions((prev) => mergeAndSortTitles(prev, liveData.titleSuggestions))
        setRoundNumber((prev) => prev + 1)
        setGuessInput('')
        setShowSuggestions(false)
        setRevealed(false)
        setLastResult(null)
        setLives(MAX_LIVES)
        setApiMessage('Loaded one random opening from AnimeThemes API')
      })
      .catch(() => {
        setLoadError('Unable to load next round from AnimeThemes API. Try again.')
      })
      .finally(() => {
        setLoadingNextRound(false)
      })
  }

  let feedbackMessage = <p className="text-zinc-400">Wrong guess costs 1 life and unlocks the next reveal stage.</p>
  if (lastResult === 'correct') {
    feedbackMessage = <p className="font-medium text-emerald-300">Correct! +{lives} points.</p>
  }
  if (lastResult === 'wrong') {
    feedbackMessage = <p className="font-medium text-amber-300">Wrong guess. Life lost, reveal stage increased.</p>
  }
  if (lastResult === 'out') {
    feedbackMessage = (
      <p className="font-medium text-rose-300">
        Out of lives. Round over. Answer: <span className="text-rose-200">{currentRound.answer}</span>
      </p>
    )
  }

  let nextRoundLabel = 'Next Round'
  if (loadingNextRound) {
    nextRoundLabel = 'Loading...'
  } else if (prefetchingNextRound) {
    nextRoundLabel = 'Next Round (preparing...)'
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-300/20 bg-black/30 p-4 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300/80">JemAnime</p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Guess the Anime Song</h1>
          <p className="mt-1 text-xs text-zinc-300">{apiMessage}</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-300">Score</p>
          <p className="text-2xl font-extrabold text-emerald-300">{score}</p>
          <p className="mt-1 text-sm font-semibold text-rose-300">Lives: {lives}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-violet-300/20 bg-zinc-950/60 p-5 shadow-2xl shadow-violet-950/40">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-300">
          <span>Round {roundNumber}</span>
          <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200">{stage.label}</span>
        </div>

        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-6 rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-4">
          <MediaPanel currentRound={currentRound} stage={stage} revealFully={revealVideoFully} />
        </div>

        <div className="relative mb-2">
          <label htmlFor="anime-guess" className="mb-2 block text-sm font-medium text-zinc-300">
            Your guess
          </label>
          <input
            id="anime-guess"
            type="text"
            value={guessInput}
            onChange={(event) => setGuessInput(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            disabled={revealed || loadingNextRound}
            placeholder="Type anime title..."
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400"
          />

          {!revealed && showSuggestions && filteredSuggestions.length > 0 ? (
            <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-950/95 p-1 shadow-xl">
              {filteredSuggestions.map((title) => (
                <li key={title}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setGuessInput(title)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    {title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitGuess}
            disabled={!guessInput.trim() || revealed || loadingNextRound}
            className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit Guess
          </button>

          <button
            type="button"
            onClick={revealMore}
            disabled={revealed || lives <= 0 || loadingNextRound}
            className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Skip (-1 life)
          </button>

          <button
            type="button"
            onClick={nextRound}
            disabled={!revealed || loadingNextRound}
            className="rounded-xl border border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextRoundLabel}
          </button>
        </div>

        {prefetchedRound ? <p className="mt-3 text-xs text-emerald-300">Next round is prefetched.</p> : null}

        <div className="mt-5 min-h-14 rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm">{feedbackMessage}</div>
      </section>
    </main>
  )
}

export default App
