import { useEffect, useMemo, useState } from 'react'

import { fetchAllAnimeTitleSuggestions, fetchAnimeThemesOpeningRounds, type Round } from '../lib/animethemes'
import { MAX_LIVES, REVEAL_STAGES, type RevealStage } from './revealStages'
import { filterTitleSuggestions, mergeAndSortTitles, sortTitles } from './titleUtils'

export type GuessResult = 'correct' | 'wrong' | 'out' | null

export type AnimeSongGameModel = {
  currentRound: Round | null
  titleSuggestions: string[]
  roundNumber: number
  guessInput: string
  showSuggestions: boolean
  revealed: boolean
  score: number
  lives: number
  loadingApiRounds: boolean
  loadingNextRound: boolean
  prefetchingNextRound: boolean
  prefetchedRound: Round | null
  loadError: string | null
  apiMessage: string
  lastResult: GuessResult
  stage: RevealStage
  revealVideoFully: boolean
  progress: number
  filteredSuggestions: string[]
  canSubmitGuess: boolean
  canRevealMore: boolean
  canNextRound: boolean
  nextRoundLabel: string
  handleGuessInputChange: (value: string) => void
  handleGuessInputFocus: () => void
  handleGuessInputBlur: () => void
  handleSuggestionSelect: (title: string) => void
  submitGuess: () => void
  revealMore: () => void
  nextRound: () => void
}

export function useAnimeSongGame(): AnimeSongGameModel {
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
  const [lastResult, setLastResult] = useState<GuessResult>(null)

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
          setApiMessage('Loaded one random opening from AnimeThemes API')
        } else {
          setLoadError('AnimeThemes returned no playable rounds. Try again.')
          setApiMessage('No playable rounds returned by AnimeThemes API')
        }
      } catch {
        if (!cancelled) {
          setLoadError('Unable to load AnimeThemes API. Check your network and try again.')
          setApiMessage('AnimeThemes API unavailable')
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
  const progress = 100

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

  useEffect(() => {
    const prefetchVideoUrl = prefetchedRound?.videoUrl
    if (!prefetchVideoUrl) {
      return
    }

    const preloadLink = document.createElement('link')
    preloadLink.rel = 'preload'
    preloadLink.as = 'video'
    preloadLink.href = prefetchVideoUrl
    document.head.appendChild(preloadLink)

    // Preload links are sometimes ignored for video by browsers, so warm it with a hidden element too.
    const prebufferVideo = document.createElement('video')
    prebufferVideo.preload = 'auto'
    prebufferVideo.muted = true
    prebufferVideo.playsInline = true
    prebufferVideo.src = prefetchVideoUrl
    prebufferVideo.style.position = 'fixed'
    prebufferVideo.style.width = '1px'
    prebufferVideo.style.height = '1px'
    prebufferVideo.style.opacity = '0'
    prebufferVideo.style.pointerEvents = 'none'
    prebufferVideo.style.left = '-9999px'
    prebufferVideo.setAttribute('aria-hidden', 'true')
    document.body.appendChild(prebufferVideo)
    prebufferVideo.load()

    return () => {
      preloadLink.remove()
      prebufferVideo.remove()
    }
  }, [prefetchedRound?.videoUrl])

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

  const canSubmitGuess = guessInput.trim().length > 0 && !revealed && !loadingNextRound
  const canRevealMore = !revealed && lives > 0 && !loadingNextRound
  const canNextRound = revealed && !loadingNextRound

  let nextRoundLabel = 'Next Round'
  if (loadingNextRound) {
    nextRoundLabel = 'Loading...'
  } else if (prefetchingNextRound) {
    nextRoundLabel = 'Next Round (preparing...)'
  }

  const handleGuessInputChange = (value: string) => {
    setGuessInput(value)
  }

  const handleGuessInputFocus = () => {
    setShowSuggestions(true)
  }

  const handleGuessInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 120)
  }

  const handleSuggestionSelect = (title: string) => {
    setGuessInput(title)
  }

  return {
    currentRound,
    titleSuggestions,
    roundNumber,
    guessInput,
    showSuggestions,
    revealed,
    score,
    lives,
    loadingApiRounds,
    loadingNextRound,
    prefetchingNextRound,
    prefetchedRound,
    loadError,
    apiMessage,
    lastResult,
    stage,
    revealVideoFully,
    progress,
    filteredSuggestions,
    canSubmitGuess,
    canRevealMore,
    canNextRound,
    nextRoundLabel,
    handleGuessInputChange,
    handleGuessInputFocus,
    handleGuessInputBlur,
    handleSuggestionSelect,
    submitGuess,
    revealMore,
    nextRound,
  }
}
