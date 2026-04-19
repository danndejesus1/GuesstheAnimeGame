import type { GuessResult } from './useAnimeSongGame'

export type FeedbackViewModel = {
  className: string
  text: string
}

export function getFeedbackViewModel(lastResult: GuessResult, lives: number, answer: string): FeedbackViewModel {
  if (lastResult === 'correct') {
    return {
      className: 'font-medium text-emerald-300',
      text: `Correct! +${lives} points.`,
    }
  }

  if (lastResult === 'wrong') {
    return {
      className: 'font-medium text-amber-300',
      text: 'Wrong guess. Life lost, reveal stage increased.',
    }
  }

  if (lastResult === 'out') {
    return {
      className: 'font-medium text-rose-300',
      text: `Out of lives. Round over. Answer: ${answer}`,
    }
  }

  return {
    className: 'text-zinc-400',
    text: 'Wrong guess costs 1 life and unlocks the next reveal stage.',
  }
}
