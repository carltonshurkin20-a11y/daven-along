 'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import adonOlam from '../data/adon-olam.json';
import berachos from '../data/berachos.json';

// ─── Types ───────────────────────────────────────────────────────
interface Word { text: string; start: number; end: number; }
interface Line { words: Word[]; translation: string; }
interface Section { id: string; title: string; titleEn: string; translation: string; lines: Line[]; }
interface Prayer { id: number; slug: string; nameHeb: string; nameEn: string; totalDuration: number; audioUrl: string; sections: Section[]; }
interface FlatWord extends Word { sectionIdx: number; lineIdx: number; globalIdx: number; }
interface PageData { lines: { words: Word[]; translation: string; lineKey: string; }[]; }

// ─── Prayer Menu Data ─────────────────────────────────────────────
const PRAYER_MENU = [
  { slug: 'adon-olam',     nameHeb: 'אֲדוֹן עוֹלָם',      nameEn: 'Adon Olam',      time: 'Morning',   available: true  },
  { slug: 'berachos',      nameHeb: 'בִּרְכּוֹת הַשַּׁחַר', nameEn: 'Morning Brachos', time: 'Morning',   available: true  },
  { slug: 'modeh-ani',     nameHeb: 'מוֹדֶה אֲנִי',        nameEn: 'Modeh Ani',       time: 'Morning',   available: false },
  { slug: 'shema',         nameHeb: 'שְׁמַע יִשְׂרָאֵל',   nameEn: 'Shema',           time: 'Morning',   available: false },
  { slug: 'shmoneh-esrei', nameHeb: 'שְׁמוֹנֶה עֶשְׂרֵה',  nameEn: 'Shmoneh Esrei',   time: 'Morning',   available: false },
  { slug: 'ashrei',        nameHeb: 'אַשְׁרֵי',             nameEn: 'Ashrei',          time: 'Afternoon', available: false },
  { slug: 'aleinu',        nameHeb: 'עָלֵינוּ',             nameEn: 'Aleinu',          time: 'All',       available: false },
  { slug: 'kaddish',       nameHeb: 'קַדִּישׁ',             nameEn: 'Kaddish',         time: 'All',       available: false },
  { slug: 'lecha-dodi',    nameHeb: 'לְכָה דוֹדִי',        nameEn: 'Lecha Dodi',      time: 'Shabbos',   available: false },
];

// ─── Sync Engine ─────────────────────────────────────────────────
function buildFlatWords(sections: Section[]): FlatWord[] {
  const flat: FlatWord[] = [];
  let gi = 0;
  sections.forEach((sec, si) => {
    sec.lines.forEach((line, li) => {
      line.words.forEach((word) => {
        flat.push({ ...word, sectionIdx: si, lineIdx: li, globalIdx: gi++ });
      });
    });
  });
  return flat;
}

function findActiveWord(words: FlatWord[], t: number): number {
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

// ─── Build Pages ─────────────────────────────────────────────────
// For berachos: one section per page. For everything else: 5 lines per page.
const LINES_PER_PAGE = 5;

function buildPages(sections: Section[], onePerSection: boolean): PageData[] {
  if (onePerSection) {
    // Each beracha gets its own page
    return sections.map((sec) => ({
      lines: sec.lines.map((line, li) => ({
        words: line.words,
        translation: line.translation || (li === 0 ? sec.translation : ''),
        lineKey: `${sec.id}-${li}`,
      }))
    }));
  }

  // Default: group lines 5 per page
  const allLines: { words: Word[]; translation: string; lineKey: string }[] = [];
  sections.forEach((sec) => {
    sec.lines.forEach((line, li) => {
      allLines.push({
        words: line.words,
        translation: (line as any).translation || (li === 0 ? sec.translation : ''),
        lineKey: `${sec.id}-${li}`,
      });
    });
  });
  const pages: PageData[] = [];
  for (let i = 0; i < allLines.length; i += LINES_PER_PAGE) {
    pages.push({ lines: allLines.slice(i, i + LINES_PER_PAGE) });
  }
  return pages;
}

// ─── Format time ─────────────────────────────────────────────────
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function Home() {
  const [screen, setScreen] = useState<'menu' | 'loading' | 'siddur'>('menu');
  const [isDark, setIsDark] = useState(true);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState<'none' | 'forward' | 'back'>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const flatWordsRef = useRef<FlatWord[]>([]);
  const pagesRef = useRef<PageData[]>([]);

  // ── Colours ──
  const C = {
    bg:       isDark ? '#0d0a06' : '#e8dfc8',
    panel:    isDark ? '#13100a' : '#2a1f0e',
    paper:    isDark ? '#1a1510' : '#fdf6e8',
    ink:      isDark ? '#e8dfc8' : '#1a1208',
    inkDim:   isDark ? '#6a6050' : '#8a7a60',
    gold:     '#c8a84b',
    goldGlow: 'rgba(200,168,75,0.85)',
    border:   isDark ? 'rgba(200,168,75,0.12)' : 'rgba(42,31,14,0.15)',
    spine:    isDark ? '#0a0806' : '#2a1f0e',
  };

  // ── Open a prayer ──
  const openPrayer = (slug: string) => {
    setSelectedSlug(slug);
    setScreen('loading');
    setTimeout(() => {
      const prayer = (slug === 'berachos' ? berachos : adonOlam) as unknown as Prayer;
      const onePerSection = slug === 'berachos';
      setSelectedPrayer(prayer);
      flatWordsRef.current = buildFlatWords(prayer.sections);
      pagesRef.current = buildPages(prayer.sections, onePerSection);
      setCurrentPage(0);
      setCurrentTime(0);
      setActiveIdx(-1);
      setIsPlaying(false);
      setScreen('siddur');
    }, 1800);
  };

  // ── Audio tick (RAF loop) ──
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = audio.currentTime;
    setCurrentTime(t);
    const idx = findActiveWord(flatWordsRef.current, t);
    setActiveIdx(idx);

    // Auto page turn
    if (idx >= 0) {
      const word = flatWordsRef.current[idx];
      const sections = selectedPrayer?.sections || [];
      let globalLine = 0;
      let found = false;
      for (const sec of sections) {
        for (let li = 0; li < sec.lines.length; li++) {
          const hasWord = sec.lines[li].words.some(
            (w) => w.start === word.start && w.text === word.text
          );
          if (hasWord) { found = true; break; }
          globalLine++;
        }
        if (found) break;
      }
      const wordPage = selectedSlug === 'berachos'
        ? word.sectionIdx
        : Math.floor(globalLine / LINES_PER_PAGE);
      if (wordPage !== currentPage) {
        flipPage(wordPage > currentPage ? 'forward' : 'back', wordPage);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [currentPage, selectedPrayer, selectedSlug]);

  // ── Play / Pause ──
  const play = useCallback(() => {
    audioRef.current?.play();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Seek ──
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const seekToWord = (start: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      setCurrentTime(start);
      if (!isPlaying) play();
    }
  };

  // ── Speed ──
  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  // ── Page flip ──
  const flipPage = (dir: 'forward' | 'back', targetPage?: number) => {
    const pages = pagesRef.current;
    const target = targetPage !== undefined ? targetPage : (dir === 'forward' ? currentPage + 1 : currentPage - 1);
    if (target < 0 || target >= pages.length) return;
    setFlipping(dir);
    setTimeout(() => {
      setCurrentPage(target);
      setFlipping('none');
    }, 400);
  };

  // ── Touch swipe ──
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) flipPage(diff > 0 ? 'forward' : 'back');
    setTouchStart(null);
  };

  // ── Auto-scroll active word into view ──
  useEffect(() => {
    activeWordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== 'siddur') return;
      if (e.code === 'Space') { e.preventDefault(); isPlaying ? pause() : play(); }
      if (e.code === 'ArrowRight') flipPage('forward');
      if (e.code === 'ArrowLeft') flipPage('back');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, isPlaying, play, pause, currentPage]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const pages = pagesRef.current;

  // ════════════════════════════════════════════
  // SCREEN: MENU
  // ════════════════════════════════════════════
  if (screen === 'menu') return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
      <div style={{ background: C.panel, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', color: C.gold, fontSize: '1.4rem', letterSpacing: '0.05em' }}>✡ Daven Along</div>
          <div style={{ fontSize: '0.62rem', color: C.inkDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '2px' }}>Interactive Siddur</div>
        </div>
        <button onClick={() => setIsDark(!isDark)} style={{ background: 'rgba(200,168,75,0.1)', border: `1px solid ${C.border}`, borderRadius: '20px', color: C.gold, padding: '6px 14px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'sans-serif' }}>
          {isDark ? '☀ Light' : '🌙 Dark'}
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <div style={{ color: C.gold, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>— Select a Prayer —</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 40px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {PRAYER_MENU.map((prayer) => (
          <div
            key={prayer.slug}
            onClick={() => prayer.available && openPrayer(prayer.slug)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', marginBottom: '10px', borderRadius: '12px', border: `1px solid ${prayer.available ? 'rgba(200,168,75,0.25)' : C.border}`, background: prayer.available ? (isDark ? 'rgba(200,168,75,0.06)' : 'rgba(200,168,75,0.08)') : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'), cursor: prayer.available ? 'pointer' : 'default', opacity: prayer.available ? 1 : 0.5, transition: 'all 0.2s' }}
            onMouseEnter={e => { if (prayer.available) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,168,75,0.5)'; }}
            onMouseLeave={e => { if (prayer.available) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,168,75,0.25)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: prayer.available ? C.gold : C.inkDim, boxShadow: prayer.available ? `0 0 8px ${C.gold}` : 'none', flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'serif', fontSize: '1.3rem', color: prayer.available ? C.gold : C.ink, direction: 'rtl', marginBottom: '2px' }}>{prayer.nameHeb}</div>
                <div style={{ fontSize: '0.75rem', color: C.inkDim, fontFamily: 'sans-serif' }}>{prayer.nameEn} · {prayer.time}</div>
              </div>
            </div>
            {prayer.available
              ? <div style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,168,75,0.15)', color: C.gold, border: `1px solid rgba(200,168,75,0.3)`, fontFamily: 'sans-serif' }}>Open ▶</div>
              : <div style={{ fontSize: '0.6rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(100,100,100,0.1)', color: C.inkDim, border: `1px solid rgba(100,100,100,0.2)`, fontFamily: 'sans-serif' }}>Coming Soon</div>
            }
          </div>
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════
  // SCREEN: LOADING
  // ════════════════════════════════════════════
  if (screen === 'loading') return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '3rem', color: C.gold, animation: 'pulse 1.5s infinite' }}>✡</div>
      <div style={{ fontFamily: 'serif', fontSize: '1.4rem', color: C.gold, direction: 'rtl' }}>
        {PRAYER_MENU.find(p => p.slug === selectedSlug)?.nameHeb || ''}
      </div>
      <div style={{ fontSize: '0.75rem', color: C.inkDim, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Loading prayer...</div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, opacity: 0.3, animation: `dot ${0.8}s ${i * 0.2}s infinite alternate` }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.95)} }
        @keyframes dot { from{opacity:0.2} to{opacity:1} }
      `}</style>
    </div>
  );

  // ════════════════════════════════════════════
  // SCREEN: SIDDUR
  // ════════════════════════════════════════════
  const currentPageData = pages[currentPage];

  return (
    <div
      style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', transition: 'all 0.3s', userSelect: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* TOP BAR */}
      <div style={{ background: C.panel, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => { pause(); setScreen('menu'); }} style={{ background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'sans-serif', padding: '4px 8px' }}>
          ← Menu
        </button>
        <div style={{ fontFamily: 'serif', color: C.gold, fontSize: '1rem', direction: 'rtl' }}>
          {selectedPrayer?.nameHeb || ''}
        </div>
        <button onClick={() => setIsDark(!isDark)} style={{ background: 'transparent', border: 'none', color: C.inkDim, cursor: 'pointer', fontSize: '1rem' }}>
          {isDark ? '☀' : '🌙'}
        </button>
      </div>

      {/* BOOK STAGE */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: 'min(680px, 96vw)', maxHeight: 'calc(100dvh - 190px)', display: 'flex', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', borderRadius: '2px 6px 6px 2px', overflow: 'hidden', transform: flipping === 'forward' ? 'perspective(1200px) rotateY(-4deg)' : flipping === 'back' ? 'perspective(1200px) rotateY(4deg)' : 'perspective(1200px) rotateY(0deg)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
          {/* Spine */}
          <div style={{ width: '22px', background: `linear-gradient(to right, ${C.spine}, #2a1f0e, ${C.spine})`, flexShrink: 0, boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.4)' }} />

          {/* Page */}
          <div style={{ flex: 1, background: C.paper, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
            {/* Page header */}
            <div style={{ textAlign: 'center', padding: '16px 16px 8px', borderBottom: `1px solid ${isDark ? 'rgba(200,168,75,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
              <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${C.gold}, transparent)`, marginBottom: '8px', opacity: 0.4 }} />
              {/* Show beracha title for berachos */}
              {selectedSlug === 'berachos' && selectedPrayer?.sections[currentPage] && (
                <div style={{ fontFamily: 'serif', fontSize: '0.9rem', color: C.gold, direction: 'rtl', marginBottom: '4px' }}>
                  {selectedPrayer.sections[currentPage].titleEn}
                </div>
              )}
              <div style={{ fontSize: '0.6rem', color: C.inkDim, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                {selectedSlug === 'berachos' ? `Beracha ${currentPage + 1} of ${pages.length}` : `Page ${currentPage + 1} of ${pages.length}`}
              </div>
            </div>

            {/* Lines */}
            <div style={{ padding: '12px 20px 20px', flex: 1 }}>
              {currentPageData?.lines.map((lineData, li) => {
                const lineStartGlobal = (() => {
                  let count = 0;
                  for (let p = 0; p < currentPage; p++) {
                    pages[p].lines.forEach(l => count += l.words.length);
                  }
                  for (let l = 0; l < li; l++) {
                    count += currentPageData.lines[l].words.length;
                  }
                  return count;
                })();

                return (
                  <div key={lineData.lineKey} style={{ marginBottom: '16px' }}>
                    {/* Hebrew */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 4px', justifyContent: 'flex-end', direction: 'rtl', marginBottom: '6px' }}>
                      {lineData.words.map((word, wi) => {
                        const gIdx = lineStartGlobal + wi;
                        const isActive = gIdx === activeIdx;
                        const isPast = gIdx < activeIdx;
                        return (
                          <span
                            key={wi}
                            ref={isActive ? activeWordRef : null}
                            onClick={() => seekToWord(word.start)}
                            style={{ fontFamily: '"Noto Serif Hebrew", serif', fontSize: '1.45rem', padding: '2px 5px', borderRadius: '5px', cursor: 'pointer', direction: 'rtl', display: 'inline-block', transition: 'all 0.22s ease', color: isActive ? (isDark ? '#ffd060' : '#7a4a00') : isPast ? C.inkDim : C.ink, textShadow: isActive ? `0 0 14px ${C.goldGlow}, 0 0 30px rgba(200,168,75,0.4)` : 'none', transform: isActive ? 'scale(1.12)' : 'scale(1)', background: isActive ? 'rgba(200,168,75,0.13)' : 'transparent', fontWeight: isActive ? '600' : '400' }}
                          >
                            {word.text}
                          </span>
                        );
                      })}
                    </div>
                    {/* Translation */}
                    {lineData.translation && (
                      <div style={{ fontSize: '0.78rem', color: C.inkDim, fontFamily: 'sans-serif', fontWeight: '300', lineHeight: '1.5', paddingLeft: '4px', borderLeft: `2px solid rgba(200,168,75,0.2)`, marginLeft: '4px', paddingRight: '8px', direction: 'ltr' }}>
                        {lineData.translation}
                      </div>
                    )}
                    {li < currentPageData.lines.length - 1 && (
                      <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', margin: '8px 0 0' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Page number */}
            <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.6rem', color: C.inkDim, fontFamily: 'sans-serif' }}>
              {currentPage + 1}
            </div>
          </div>
        </div>

        {/* Page arrows */}
        {currentPage > 0 && (
          <button onClick={() => flipPage('back')} style={{ position: 'absolute', left: '8px', bottom: '60px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(200,168,75,0.15)', border: `1px solid rgba(200,168,75,0.3)`, color: C.gold, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
        )}
        {currentPage < pages.length - 1 && (
          <button onClick={() => flipPage('forward')} style={{ position: 'absolute', right: '8px', bottom: '60px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(200,168,75,0.15)', border: `1px solid rgba(200,168,75,0.3)`, color: C.gold, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
        )}
      </div>

      {/* HIDDEN AUDIO */}
      <audio
        ref={audioRef}
        src={selectedPrayer?.audioUrl || ''}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); cancelAnimationFrame(rafRef.current); }}
      />

      {/* PLAYBACK BAR */}
      <div style={{ background: C.panel, borderTop: `1px solid ${C.border}`, padding: '10px 16px 14px', flexShrink: 0, direction: 'ltr' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.65rem', color: C.inkDim, minWidth: '34px', fontFamily: 'monospace' }}>{fmt(currentTime)}</span>
          <div onClick={seek} style={{ flex: 1, height: '4px', background: 'rgba(200,168,75,0.12)', borderRadius: '4px', cursor: 'pointer', position: 'relative' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, #7a6425, ${C.gold})`, borderRadius: '4px', position: 'relative', transition: 'width 0.1s linear' }}>
              <div style={{ position: 'absolute', right: '-6px', top: '-4px', width: '12px', height: '12px', borderRadius: '50%', background: C.gold, boxShadow: `0 0 8px rgba(200,168,75,0.6)` }} />
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', color: C.inkDim, minWidth: '34px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(duration)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
              <button key={s} onClick={() => changeSpeed(s)} style={{ padding: '3px 7px', borderRadius: '10px', background: speed === s ? 'rgba(200,168,75,0.2)' : 'transparent', border: `1px solid ${speed === s ? 'rgba(200,168,75,0.5)' : 'rgba(200,168,75,0.12)'}`, color: speed === s ? C.gold : C.inkDim, fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'sans-serif' }}>{s}×</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 5); }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid rgba(200,168,75,0.2)`, color: C.gold, cursor: 'pointer', fontSize: '0.8rem' }}>⏮</button>
            <button onClick={isPlaying ? pause : play} style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.gold, border: 'none', color: '#0d0a06', fontSize: '1.2rem', cursor: 'pointer', boxShadow: `0 0 20px rgba(200,168,75,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 5); }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid rgba(200,168,75,0.2)`, color: C.gold, cursor: 'pointer', fontSize: '0.8rem' }}>⏭</button>
          </div>
          <div style={{ fontSize: '0.68rem', color: C.inkDim, textAlign: 'right', fontFamily: 'sans-serif' }}>
            <div style={{ color: 'rgba(200,168,75,0.7)', fontWeight: '500' }}>{selectedPrayer?.nameHeb || ''}</div>
            <div>Ashkenaz</div>
          </div>
        </div>
      </div>
    </div>
  );
}
