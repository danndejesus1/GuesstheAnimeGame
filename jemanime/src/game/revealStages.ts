export const MAX_LIVES = 5

export type RevealStage = {
  label: string
  videoFilter: string
  maxPreviewSeconds: number
}

export const REVEAL_STAGES: RevealStage[] = [
  { label: 'Stage 1 (5 lives)', videoFilter: 'blur(20px)', maxPreviewSeconds: 20 },
  { label: 'Stage 2 (4 lives)', videoFilter: 'blur(13px)', maxPreviewSeconds: 30 },
  { label: 'Stage 3 (3 lives)', videoFilter: 'blur(8px)', maxPreviewSeconds: 40 },
  { label: 'Stage 4 (2 lives)', videoFilter: 'blur(4px)', maxPreviewSeconds: 50 },
  { label: 'Stage 5 (1 life)', videoFilter: 'blur(1.5px)', maxPreviewSeconds: 60 },
  { label: 'Final Stage (0 lives)', videoFilter: 'none', maxPreviewSeconds: 70 },
]
