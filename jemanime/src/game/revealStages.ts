export const MAX_LIVES = 5

export type RevealStage = {
  label: string
  videoFilter: string
  volume: number
}

export const REVEAL_STAGES: RevealStage[] = [
  { label: 'Stage 1 (5 lives)', videoFilter: 'blur(20px)', volume: 0.18 },
  { label: 'Stage 2 (4 lives)', videoFilter: 'blur(13px)', volume: 0.28 },
  { label: 'Stage 3 (3 lives)', videoFilter: 'blur(8px)', volume: 0.42 },
  { label: 'Stage 4 (2 lives)', videoFilter: 'blur(4px)', volume: 0.6 },
  { label: 'Stage 5 (1 life)', videoFilter: 'blur(1.5px)', volume: 0.78 },
  { label: 'Final Stage (0 lives)', videoFilter: 'none', volume: 1 },
]
