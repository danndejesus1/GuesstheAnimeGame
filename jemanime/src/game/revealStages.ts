export const MAX_LIVES = 5

export type RevealStage = {
  label: string
  videoFilter: string
  volume: number
  playbackRate: number
}

export const REVEAL_STAGES: RevealStage[] = [
  { label: 'Stage 1 (5 lives)', videoFilter: 'blur(20px) brightness(0.45) saturate(0.35)', volume: 0.18, playbackRate: 0.84 },
  { label: 'Stage 2 (4 lives)', videoFilter: 'blur(13px) brightness(0.58) saturate(0.5)', volume: 0.28, playbackRate: 0.9 },
  { label: 'Stage 3 (3 lives)', videoFilter: 'blur(8px) brightness(0.7) saturate(0.7)', volume: 0.42, playbackRate: 0.95 },
  { label: 'Stage 4 (2 lives)', videoFilter: 'blur(4px) brightness(0.85) saturate(0.86)', volume: 0.6, playbackRate: 1 },
  { label: 'Stage 5 (1 life)', videoFilter: 'blur(1.5px) brightness(0.95) saturate(0.95)', volume: 0.78, playbackRate: 1 },
  { label: 'Final Stage (0 lives)', videoFilter: 'none', volume: 1, playbackRate: 1 },
]
