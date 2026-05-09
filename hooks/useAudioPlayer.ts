/**
 * useAudioPlayer.ts — Howler.js React wrapper
 *
 * Fires onTimeUpdate(t) via requestAnimationFrame every ~16ms.
 * Supports: play, pause, seek, speed (rate), duration.
 *
 * Install Howler: npm install howler && npm install -D @types/howler
 */
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler'; // uncomment in production

interface UseAudioPlayerOptions {
  src: string;
  onTimeUpdate?: (time: number) => void;
  onEnd?: () => void;
}

export function useAudioPlayer({ src, onTimeUpdate, onEnd }: UseAudioPlayerOptions) {
  const howlRef = useRef<any>(null);
  const rafRef  = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);

  useEffect(() => {
    // Production: uncomment below
    howlRef.current = new Howl({
      src: [src], html5: true,
      onload: () => setDuration(howlRef.current.duration()),
      onend:  () => { setIsPlaying(false); cancelAnimationFrame(rafRef.current); onEnd?.(); },
    });
    return () => { howlRef.current?.unload(); cancelAnimationFrame(rafRef.current); };
  }, [src]);

  const startRAF = useCallback(() => {
    const tick = () => {
      const t: number = howlRef.current?.seek() ?? 0;
      setCurrentTime(t);
      onTimeUpdate?.(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onTimeUpdate]);

  const play  = useCallback(() => { howlRef.current?.play();  setIsPlaying(true);  startRAF(); }, [startRAF]);
  const pause = useCallback(() => { howlRef.current?.pause(); setIsPlaying(false); cancelAnimationFrame(rafRef.current); }, []);
  const seek  = useCallback((t: number) => { howlRef.current?.seek(t); setCurrentTime(t); onTimeUpdate?.(t); }, [onTimeUpdate]);
  const setSpeed = useCallback((s: number) => { howlRef.current?.rate(s); setSpeedState(s); }, []);

  return { play, pause, seek, setSpeed, currentTime, duration, isPlaying, speed };
}
