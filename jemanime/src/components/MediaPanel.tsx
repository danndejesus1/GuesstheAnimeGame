import { useEffect, useRef } from 'react'

import type { RevealStage } from '../game/revealStages'
import type { Round } from '../lib/animethemes'

const EMPTY_VTT = 'data:text/vtt;charset=utf-8,WEBVTT%0A%0A'

type MediaPanelProps = Readonly<{
  currentRound: Round
  stage: RevealStage
  revealFully?: boolean
}>

export function MediaPanel({ currentRound, stage, revealFully = false }: MediaPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const hasVideo = Boolean(currentRound.videoUrl)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = revealFully ? 1 : stage.volume
      videoRef.current.playbackRate = 1
    }
  }, [revealFully, stage])

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Video</p>
      </div>

      {hasVideo ? (
        <div className="relative">
          <video
            ref={videoRef}
            key={currentRound.videoUrl}
            controls
            preload="auto"
            className="w-full rounded-lg border border-zinc-700 bg-black"
            src={currentRound.videoUrl}
          >
            <track kind="captions" src={EMPTY_VTT} srcLang="en" label="captions" default />
          </video>

          {revealFully ? null : (
            <div
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                backdropFilter: stage.videoFilter,
                WebkitBackdropFilter: stage.videoFilter,
                maskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 78px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 78px), transparent 100%)',
              }}
            />
          )}
        </div>
      ) : null}

      {hasVideo ? null : <p className="text-sm text-zinc-400">No playable video found for this round.</p>}
    </div>
  )
}
