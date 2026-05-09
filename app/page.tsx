 'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import adonOlam from '../data/adon-olam.json';

// ── Flatten all words from the prayer data ──
function buildWordList(sections: any[]) {
  const words: any[] = [];
  sections.forEach((section, si) => {
    section.lines.forEach((line: any, li: number) => {
      line.words.forEach((word: any, wi: number) => {
        words.push({ ...word, sectionIdx: si, lineIdx: li, wordIdx: wi });
      });
    });
  });
  return words;
}

// ── Binary search: find active word at currentTime ──
function findActiveWord(words: any[], t: number): number {
  let lo = 0, hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (t < words[mid].start) hi = mid - 1;
    else if (t > words[mid].end) lo = mid + 1;
    else return mid;
  }
  if (lo < words.length && words[lo].start - t <= 0.2) return lo;
  return -1;
}

const allWords = buildWordList(adonOlam.sections);

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [isDark, setIsDark] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  // RAF loop — runs every frame while playing
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = audio.currentTime;
    setCurrentTime(t);
    const idx = findActiveWord(allWords, t);
    setActiveIdx(idx);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const play = () => {
    audioRef.current?.play();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  // Auto-scroll to active word
  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  const bg = isDark ? '#0d0a06' : '#f7f0e3';
  const paper = isDark ? '#1a1510' : '#fdf8f0';
  const ink = isDark ? '#e8dfc8' : '#1a1208';
  const muted = isDark ? '#6a6050' : '#9a8a70';

  return (
    <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', transition: 'all 0.3s' }}>

      {/* TOP BAR */}
      <div style={{ background: isDark ? '#13100a' : '#2a1f0e', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(200,168,75,0.15)' }}>
        <div style={{ fontFamily: 'Georgia, serif', color: '#c8a84b', fontSize: '1.2rem' }}>✡ Daven Along</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'rgba(200,168,75,0.1)', border: '1px solid rgba(200,168,75,0.2)', borderRadius: '8px', color: '#c8a84b', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
            {isDark ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {/* SIDDUR */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'hidden' }}>
        <div style={{ width: 'min(700px, 96vw)', maxHeight: 'calc(100dvh - 200px)', background: paper, borderRadius: '4px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', overflow: 'hidden' }}>

          {/* Spine */}
          <div style={{ width: '20px', background: 'linear-gradient(to right, #0a0806, #1a1208)', flexShrink: 0 }} />

          {/* Hebrew Page */}
          <div style={{ flex: 1, padding: '28px 24px', overflowY: 'auto', direction: 'rtl' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'serif', fontSize: '1rem', color: '#8a6425', marginBottom: '4px' }}>אֲדוֹן עוֹלָם</div>
              <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #c8a84b, transparent)', margin: '6px auto', width: '60px' }} />
              <div style={{ fontSize: '0.6rem', color: '#9a7a40', letterSpacing: '0.1em', direction: 'ltr' }}>ADON OLAM</div>
            </div>

            {/* Prayer text */}
            <div style={{ direction: 'rtl' }}>
              {adonOlam.sections[0].lines.map((line: any, li: number) => {
                let wordCount = 0;
                adonOlam.sections[0].lines.slice(0, li).forEach((l: any) => wordCount += l.words.length);
                return (
                  <div key={li} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 2px', justifyContent: 'flex-end', marginBottom: '4px', lineHeight: '2.2' }}>
                    {line.words.map((word: any, wi: number) => {
                      const globalIdx = wordCount + wi;
                      const isActive = globalIdx === activeIdx;
                      const isPast = globalIdx < activeIdx;
                      return (
                        <span
                          key={wi}
                          ref={isActive ? activeWordRef : null}
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = word.start;
                              setCurrentTime(word.start);
                              if (!isPlaying) play();
                            }
                          }}
                          style={{
                            fontFamily: '"Noto Serif Hebrew", "Frank Ruhl Libre", serif',
                            fontSize: '1.3rem',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            direction: 'rtl',
                            transition: 'all 0.25s',
                            color: isActive ? (isDark ? '#f0c060' : '#8a5500') : isPast ? muted : ink,
                            textShadow: isActive ? '0 0 12px rgba(200,168,75,0.9), 0 0 28px rgba(200,168,75,0.5)' : 'none',
                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                            background: isActive ? 'rgba(200,168,75,0.12)' : 'transparent',
                            display: 'inline-block',
                            fontWeight: isActive ? '600' : '400',
                          }}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Translation Page */}
          <div style={{ width: '220px', padding: '28px 16px', overflowY: 'auto', direction: 'ltr', borderLeft: `1px solid ${isDark ? '#2a2218' : '#e0d4b8'}`, background: isDark ? '#151008' : '#f0e8d4' }}>
            <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a6425', marginBottom: '12px' }}>Translation</div>
            <div style={{ fontSize: '0.78rem', color: ink, lineHeight: '1.7', fontWeight: '300' }}>
              {adonOlam.sections[0].translation}
            </div>
          </div>

        </div>
      </div>

      {/* AUDIO (hidden) */}
      <audio
        ref={audioRef}
        src="/audio/02 Adon Olam.mp3"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); cancelAnimationFrame(rafRef.current); }}
      />

      {/* PLAYBACK BAR */}
      <div style={{ background: isDark ? '#13100a' : '#2a1f0e', borderTop: '1px solid rgba(200,168,75,0.12)', padding: '10px 20px 14px', direction: 'ltr' }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.68rem', color: '#6a6050', minWidth: '36px' }}>{fmt(currentTime)}</span>
          <div onClick={seek} style={{ flex: 1, height: '4px', background: 'rgba(200,168,75,0.12)', borderRadius: '4px', cursor: 'pointer', position: 'relative' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(to right, #7a6425, #c8a84b)', borderRadius: '4px', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-6px', top: '-4px', width: '12px', height: '12px', borderRadius: '50%', background: '#c8a84b', boxShadow: '0 0 8px rgba(200,168,75,0.6)' }} />
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#6a6050', minWidth: '36px', textAlign: 'right' }}>{fmt(duration)}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Speed */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
              <button key={s} onClick={() => changeSpeed(s)} style={{ padding: '3px 8px', borderRadius: '12px', background: speed === s ? 'rgba(200,168,75,0.2)' : 'transparent', border: `1px solid ${speed === s ? 'rgba(200,168,75,0.5)' : 'rgba(200,168,75,0.15)'}`, color: speed === s ? '#c8a84b' : '#6a6050', fontSize: '0.65rem', cursor: 'pointer' }}>
                {s}×
              </button>
            ))}
          </div>

          {/* Play/Pause */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { if(audioRef.current) { audioRef.current.currentTime = Math.max(0, currentTime - 5); }}} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: '1px solid rgba(200,168,75,0.2)', color: '#c8a84b', cursor: 'pointer', fontSize: '0.8rem' }}>⏮</button>
            <button onClick={isPlaying ? pause : play} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#c8a84b', border: 'none', color: '#0d0a06', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 0 20px rgba(200,168,75,0.4)' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => { if(audioRef.current) { audioRef.current.currentTime = Math.min(duration, currentTime + 5); }}} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: '1px solid rgba(200,168,75,0.2)', color: '#c8a84b', cursor: 'pointer', fontSize: '0.8rem' }}>⏭</button>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#6a6050', textAlign: 'right' }}>
            <strong style={{ color: 'rgba(200,168,75,0.7)' }}>אֲדוֹן עוֹלָם</strong> · Ashkenaz
          </div>
        </div>
      </div>
    </div>
  );
}