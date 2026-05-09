'use client';
import React from 'react';
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

interface Props {
  isPlaying: boolean; currentTime: number; duration: number; speed: number;
  prayerName: string; nusach: string;
  onPlay: () => void; onPause: () => void;
  onSeek: (t: number) => void; onSpeedChange: (s: number) => void;
  onSkipBack: () => void; onSkipForward: () => void;
}

export default function PlaybackBar({ isPlaying, currentTime, duration, speed, prayerName, nusach, onPlay, onPause, onSeek, onSpeedChange, onSkipBack, onSkipForward }: Props) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - r.left) / r.width) * duration);
  };
  return (
    <div className="playback-bar" dir="ltr">
      <div className="progress-container">
        <span className="time-label">{fmt(currentTime)}</span>
        <div className="progress-track" onClick={seek}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <span className="time-label">{fmt(duration)}</span>
      </div>
      <div className="controls">
        <div className="speed-selector">
          {SPEEDS.map(s => <button key={s} className={`speed-btn ${speed===s?'active':''}`} onClick={() => onSpeedChange(s)}>{s}×</button>)}
        </div>
        <div className="controls-center">
          <button className="ctrl-btn" onClick={onSkipBack}>⏮</button>
          <button className="play-btn" onClick={isPlaying ? onPause : onPlay}>{isPlaying ? '⏸' : '▶'}</button>
          <button className="ctrl-btn" onClick={onSkipForward}>⏭</button>
        </div>
        <div className="now-playing"><strong>{prayerName}</strong> · {nusach}</div>
      </div>
    </div>
  );
}
