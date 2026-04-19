import { MediaPanel } from './components/MediaPanel'
import { getFeedbackViewModel } from './game/gameFeedback'
import { useAnimeSongGame } from './game/useAnimeSongGame'

function App() {
  const {
    currentRound,
    roundNumber,
    guessInput,
    showSuggestions,
    revealed,
    score,
    lives,
    loadingApiRounds,
    loadingNextRound,
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
  } = useAnimeSongGame()

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

  const feedback = getFeedbackViewModel(lastResult, lives, currentRound.answer)

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
            onChange={(event) => handleGuessInputChange(event.target.value)}
            onFocus={handleGuessInputFocus}
            onBlur={handleGuessInputBlur}
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
                    onClick={() => handleSuggestionSelect(title)}
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
            disabled={!canSubmitGuess}
            className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit Guess
          </button>

          <button
            type="button"
            onClick={revealMore}
            disabled={!canRevealMore}
            className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Skip (-1 life)
          </button>

          <button
            type="button"
            onClick={nextRound}
            disabled={!canNextRound}
            className="rounded-xl border border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextRoundLabel}
          </button>
        </div>

        {prefetchedRound ? <p className="mt-3 text-xs text-emerald-300">Next round is prefetched.</p> : null}

        <div className="mt-5 min-h-14 rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm">
          <p className={feedback.className}>{feedback.text}</p>
        </div>
      </section>
    </main>
  )
}

export default App
