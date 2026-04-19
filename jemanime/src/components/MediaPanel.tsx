import { useEffect, useRef } from 'react'

import type { RevealStage } from '../game/revealStages'
import type { Round } from '../lib/animethemes'

const EMPTY_VTT = 'data:text/vtt;charset=utf-8,WEBVTT%0A%0A'

type MediaPanelProps = Readonly<{
  currentRound: Round
  stage: RevealStage
}>

export function MediaPanel({ currentRound, stage }: MediaPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const hasVideo = Boolean(currentRound.videoUrl)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = stage.volume
      videoRef.current.playbackRate = stage.playbackRate
    }
  }, [stage])

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Video</p>
      </div>

      {hasVideo ? (
        <video
          ref={videoRef}
          key={currentRound.videoUrl}
          controls
          preload="auto"
          className="w-full rounded-lg border border-zinc-700 bg-black"
          style={{ filter: stage.videoFilter }}
          src={currentRound.videoUrl}
        >
          <track kind="captions" src={EMPTY_VTT} srcLang="en" label="captions" default />
        </video>
      ) : null}

      {hasVideo ? null : <p className="text-sm text-zinc-400">No playable video found for this round.</p>}
    </div>
  )
}
