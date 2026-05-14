 'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import adonOlam from '../data/adon-olam.json';
import berachos from '../data/berachos.json';

// ─── Types ───────────────────────────────────────────────────────
interface Word { text: string; start: number; end: number; }
interface Line { words: Word[]; translation: string; }
interface Section { id: string; title: string; titleEn: string; translation: string; lines: Line[]; }
interface Prayer { id: number | string; slug: string; nameHeb: string; nameEn: string; totalDuration: number; audioUrl: string; sections: Section[]; }
interface FlatWord extends Word { sectionIdx: number; lineIdx: number; globalIdx: number; }
interface PageData { lines: { words: Word[]; translation: string; lineKey: string; }[]; }

// ─── Torah Menu Structure ─────────────────────────────────────────
const TORAH_MENU = [
  { sefer: 'בְּרֵאשִׁית', seferEn: 'Bereishis', parshiyos: [
    { slug: 'Bereishit',   nameHeb: 'בְּרֵאשִׁית',   nameEn: 'Bereishis'   },
    { slug: 'Noach',       nameHeb: 'נֹחַ',           nameEn: 'Noach'       },
    { slug: 'Lech-Lecha',  nameHeb: 'לֶךְ לְךָ',      nameEn: 'Lech Lecha'  },
    { slug: 'Vayera',      nameHeb: 'וַיֵּרָא',        nameEn: 'Vayera'      },
    { slug: 'Chayei-Sara', nameHeb: 'חַיֵּי שָׂרָה',   nameEn: 'Chayei Sara' },
    { slug: 'Toldot',      nameHeb: 'תּוֹלְדֹת',       nameEn: 'Toldos'      },
    { slug: 'Vayetzei',    nameHeb: 'וַיֵּצֵא',        nameEn: 'Vayeitzei'   },
    { slug: 'Vayishlach',  nameHeb: 'וַיִּשְׁלַח',     nameEn: 'Vayishlach'  },
    { slug: 'Vayeshev',    nameHeb: 'וַיֵּשֶׁב',        nameEn: 'Vayeishev'   },
    { slug: 'Miketz',      nameHeb: 'מִקֵּץ',           nameEn: 'Mikeitz'     },
    { slug: 'Vayigash',    nameHeb: 'וַיִּגַּשׁ',       nameEn: 'Vayigash'    },
    { slug: 'Vayechi',     nameHeb: 'וַיְחִי',          nameEn: 'Vayechi'     },
  ]},
  { sefer: 'שְׁמוֹת', seferEn: 'Shemos', parshiyos: [
    { slug: 'Shemot',      nameHeb: 'שְׁמוֹת',          nameEn: 'Shemos'      },
    { slug: 'Vaera',       nameHeb: 'וָאֵרָא',           nameEn: "Va'era"      },
    { slug: 'Bo',          nameHeb: 'בֹּא',              nameEn: 'Bo'          },
    { slug: 'Beshalach',   nameHeb: 'בְּשַׁלַּח',        nameEn: 'Beshalach'   },
    { slug: 'Yitro',       nameHeb: 'יִתְרוֹ',           nameEn: 'Yisro'       },
    { slug: 'Mishpatim',   nameHeb: 'מִשְׁפָּטִים',      nameEn: 'Mishpatim'   },
    { slug: 'Terumah',     nameHeb: 'תְּרוּמָה',         nameEn: 'Terumah'     },
    { slug: 'Tetzaveh',    nameHeb: 'תְּצַוֶּה',         nameEn: 'Tetzaveh'    },
    { slug: 'Ki-Tisa',     nameHeb: 'כִּי תִשָּׂא',      nameEn: 'Ki Sisa'     },
    { slug: 'Vayakhel',    nameHeb: 'וַיַּקְהֵל',        nameEn: 'Vayakhel'    },
    { slug: 'Pekudei',     nameHeb: 'פְקוּדֵי',          nameEn: 'Pekudei'     },
  ]},
  { sefer: 'וַיִּקְרָא', seferEn: 'Vayikra', parshiyos: [
    { slug: 'Vayikra',     nameHeb: 'וַיִּקְרָא',        nameEn: 'Vayikra'     },
    { slug: 'Tzav',        nameHeb: 'צַו',               nameEn: 'Tzav'        },
    { slug: 'Shmini',      nameHeb: 'שְׁמִינִי',          nameEn: 'Shemini'     },
    { slug: 'Tazria',      nameHeb: 'תַזְרִיעַ',          nameEn: 'Tazria'      },
    { slug: 'Metzora',     nameHeb: 'מְצֹרָע',            nameEn: 'Metzora'     },
    { slug: 'Achrei-Mot',  nameHeb: 'אַחֲרֵי מוֹת',      nameEn: 'Acharei Mos' },
    { slug: 'Kedoshim',    nameHeb: 'קְדֹשִׁים',          nameEn: 'Kedoshim'    },
    { slug: 'Emor',        nameHeb: 'אֱמֹר',              nameEn: 'Emor'        },
    { slug: 'Behar',       nameHeb: 'בְּהַר',             nameEn: 'Behar'       },
    { slug: 'Bechukotai',  nameHeb: 'בְּחֻקֹּתַי',       nameEn: 'Bechukosai'  },
  ]},
  { sefer: 'בְּמִדְבַּר', seferEn: 'Bamidbar', parshiyos: [
    { slug: 'Bamidbar',       nameHeb: 'בְּמִדְבַּר',      nameEn: 'Bamidbar'    },
    { slug: 'Nasso',          nameHeb: 'נָשֹׂא',            nameEn: 'Nasso'       },
    { slug: "Beha'alotcha",   nameHeb: 'בְּהַעֲלֹתְךָ',    nameEn: "Beha'aloscha"},
    { slug: 'Shlach',         nameHeb: 'שְׁלַח',            nameEn: 'Shelach'     },
    { slug: 'Korach',         nameHeb: 'קֹרַח',             nameEn: 'Korach'      },
    { slug: 'Chukat',         nameHeb: 'חֻקַּת',            nameEn: 'Chukas'      },
    { slug: 'Balak',          nameHeb: 'בָּלָק',            nameEn: 'Balak'       },
    { slug: 'Pinchas',        nameHeb: 'פִּינְחָס',         nameEn: 'Pinchas'     },
    { slug: 'Matot',          nameHeb: 'מַטּוֹת',           nameEn: 'Matos'       },
    { slug: 'Masei',          nameHeb: 'מַסְעֵי',           nameEn: "Mas'ei"      },
  ]},
  { sefer: 'דְּבָרִים', seferEn: 'Devarim', parshiyos: [
    { slug: 'Devarim',        nameHeb: 'דְּבָרִים',         nameEn: 'Devarim'     },
    { slug: 'Vaetchanan',     nameHeb: 'וָאֶתְחַנַּן',      nameEn: "Va'eschanan" },
    { slug: 'Eikev',          nameHeb: 'עֵקֶב',             nameEn: 'Eikev'       },
    { slug: 'Reeh',           nameHeb: 'רְאֵה',             nameEn: "Re'eh"       },
    { slug: 'Shoftim',        nameHeb: 'שֹׁפְטִים',         nameEn: 'Shoftim'     },
    { slug: 'Ki-Teitzei',     nameHeb: 'כִּי תֵצֵא',        nameEn: 'Ki Seitzei'  },
    { slug: 'Ki-Tavo',        nameHeb: 'כִּי תָבוֹא',       nameEn: 'Ki Savo'     },
    { slug: 'Nitzavim',       nameHeb: 'נִצָּבִים',          nameEn: 'Nitzavim'    },
    { slug: 'Vayeilech',      nameHeb: 'וַיֵּלֶךְ',         nameEn: 'Vayelech'    },
    { slug: 'Haazinu',        nameHeb: 'הַאֲזִינוּ',         nameEn: "Ha'azinu"    },
    { slug: 'Vezot-Habracha', nameHeb: 'וְזֹאת הַבְּרָכָה', nameEn: 'Vezos Habracha' },
  ]},
];

// ─── Davening Menu ────────────────────────────────────────────────
const DAVENING_MENU = [
  { slug: 'adon-olam',     nameHeb: 'אֲדוֹן עוֹלָם',       nameEn: 'Adon Olam',       time: 'Morning',   available: true  },
  { slug: 'berachos',      nameHeb: 'בִּרְכּוֹת הַשַּׁחַר', nameEn: 'Morning Brachos', time: 'Morning',   available: true  },
  { slug: 'modeh-ani',     nameHeb: 'מוֹדֶה אֲנִי',         nameEn: 'Modeh Ani',       time: 'Morning',   available: false },
  { slug: 'shema',         nameHeb: 'שְׁמַע יִשְׂרָאֵל',    nameEn: 'Shema',           time: 'Morning',   available: false },
  { slug: 'shmoneh-esrei', nameHeb: 'שְׁמוֹנֶה עֶשְׂרֵה',   nameEn: 'Shmoneh Esrei',   time: 'Morning',   available: false },
  { slug: 'aleinu',        nameHeb: 'עָלֵינוּ',              nameEn: 'Aleinu',          time: 'All',       available: false },
  { slug: 'kaddish',       nameHeb: 'קַדִּישׁ',              nameEn: 'Kaddish',         time: 'All',       available: false },
  { slug: 'lecha-dodi',    nameHeb: 'לְכָה דוֹדִי',         nameEn: 'Lecha Dodi',      time: 'Shabbos',   available: false },
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
  if (t === 0) return -1;
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
const LINES_PER_PAGE = 5;
const PESUKIM_PER_PAGE = 3; // For Torah: 3 pesukim per page

function buildPages(sections: Section[], mode: 'default' | 'onePerSection' | 'torah'): PageData[] {
  if (mode === 'onePerSection') {
    return sections.map((sec) => ({
      lines: sec.lines.map((line, li) => ({
        words: line.words,
        translation: (line as any).translation || (li === 0 ? sec.translation : ''),
        lineKey: `${sec.id}-${li}`,
      }))
    }));
  }

  if (mode === 'torah') {
    const pages: PageData[] = [];
    for (let i = 0; i < sections.length; i += PESUKIM_PER_PAGE) {
      const chunk = sections.slice(i, i + PESUKIM_PER_PAGE);
      pages.push({
        lines: chunk.flatMap(sec =>
          sec.lines.map((line, li) => ({
            words: line.words,
            translation: sec.titleEn,
            lineKey: `${sec.id}-${li}`,
          }))
        )
      });
    }
    return pages;
  }

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

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function Home() {
  const [screen, setScreen] = useState<'menu' | 'torah-menu' | 'sefer-menu' | 'loading' | 'siddur'>('menu');
  const [isDark, setIsDark] = useState(true);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [selectedSefer, setSelectedSefer] = useState<typeof TORAH_MENU[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState<'none' | 'forward' | 'back'>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [pageMode, setPageMode] = useState<'default' | 'onePerSection' | 'torah'>('default');

  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const flatWordsRef = useRef<FlatWord[]>([]);
  const pagesRef = useRef<PageData[]>([]);

  const C = {
    bg:     isDark ? '#0d0a06' : '#e8dfc8',
    panel:  isDark ? '#13100a' : '#2a1f0e',
    paper:  isDark ? '#1a1510' : '#fdf6e8',
    ink:    isDark ? '#e8dfc8' : '#1a1208',
    inkDim: isDark ? '#6a6050' : '#8a7a60',
    gold:   '#c8a84b',
    goldG:  'rgba(200,168,75,0.85)',
    border: isDark ? 'rgba(200,168,75,0.12)' : 'rgba(42,31,14,0.15)',
    spine:  isDark ? '#0a0806' : '#2a1f0e',
  };

  // ── Open a davening prayer ──
  const openPrayer = async (slug: string) => {
    setSelectedSlug(slug);
    setScreen('loading');
    setTimeout(async () => {
      let prayer: Prayer;
      let mode: 'default' | 'onePerSection' | 'torah' = 'default';
      if (slug === 'berachos') {
        prayer = berachos as unknown as Prayer;
        mode = 'onePerSection';
      } else {
        prayer = adonOlam as unknown as Prayer;
      }
      setPageMode(mode);
      setSelectedPrayer(prayer);
      flatWordsRef.current = buildFlatWords(prayer.sections);
      pagesRef.current = buildPages(prayer.sections, mode);
      setCurrentPage(0);
      setCurrentTime(0);
      setActiveIdx(-1);
      setIsPlaying(false);
      setScreen('siddur');
    }, 1800);
  };

  // ── Open a Torah parsha ──
  const openParsha = async (slug: string) => {
    setSelectedSlug(slug);
    setScreen('loading');
    try {
      const res = await fetch(`/api/torah/${slug}`);
      const prayer: Prayer = await res.json();
      setPageMode('torah');
      setSelectedPrayer(prayer);
      flatWordsRef.current = buildFlatWords(prayer.sections);
      pagesRef.current = buildPages(prayer.sections, 'torah');
      setCurrentPage(0);
      setCurrentTime(0);
      setActiveIdx(-1);
      setIsPlaying(false);
      setScreen('siddur');
    } catch(e) {
      setScreen('sefer-menu');
    }
  };

  // ── Audio tick ──
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = audio.currentTime;
    setCurrentTime(t);
    const idx = findActiveWord(flatWordsRef.current, t);
    setActiveIdx(idx);
    if (idx >= 0) {
      const word = flatWordsRef.current[idx];
      const sections = selectedPrayer?.sections || [];
      let globalLine = 0, found = false;
      for (const sec of sections) {
        for (let li = 0; li < sec.lines.length; li++) {
          if (sec.lines[li].words.some(w => w.start === word.start && w.text === word.text)) { found = true; break; }
          globalLine++;
        }
        if (found) break;
      }
      const wordPage = pageMode === 'onePerSection' ? word.sectionIdx :
                       pageMode === 'torah' ? Math.floor(word.sectionIdx / PESUKIM_PER_PAGE) :
                       Math.floor(globalLine / LINES_PER_PAGE);
      if (wordPage !== currentPage) flipPage(wordPage > currentPage ? 'forward' : 'back', wordPage);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [currentPage, selectedPrayer, pageMode]);

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

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    setCurrentTime(audio.currentTime);
  };

  const seekToWord = (start: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      setCurrentTime(start);
      if (!isPlaying) play();
    }
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const flipPage = (dir: 'forward' | 'back', target?: number) => {
    const pages = pagesRef.current;
    const t = target !== undefined ? target : (dir === 'forward' ? currentPage + 1 : currentPage - 1);
    if (t < 0 || t >= pages.length) return;
    setFlipping(dir);
    setTimeout(() => { setCurrentPage(t); setFlipping('none'); }, 400);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) flipPage(diff > 0 ? 'forward' : 'back');
    setTouchStart(null);
  };

  useEffect(() => { activeWordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [activeIdx]);

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

  // ── Shared styles ──
  const menuItemStyle = (available: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', marginBottom: '8px', borderRadius: '12px',
    border: `1px solid ${available ? 'rgba(200,168,75,0.25)' : C.border}`,
    background: available ? (isDark ? 'rgba(200,168,75,0.06)' : 'rgba(200,168,75,0.08)') : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
    cursor: available ? 'pointer' : 'default',
    opacity: available ? 1 : 0.5,
    transition: 'all 0.2s',
  });

  const Header = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div style={{ background: C.panel, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onBack && <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'sans-serif' }}>← Back</button>}
        {!onBack && <div style={{ fontFamily: 'Georgia, serif', color: C.gold, fontSize: '1.3rem' }}>✡ Daven Along</div>}
        {onBack && <div style={{ fontFamily: 'serif', color: C.gold, fontSize: '1rem' }}>{title}</div>}
      </div>
      <button onClick={() => setIsDark(!isDark)} style={{ background: 'rgba(200,168,75,0.1)', border: `1px solid ${C.border}`, borderRadius: '20px', color: C.gold, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'sans-serif' }}>
        {isDark ? '☀' : '🌙'}
      </button>
    </div>
  );

  // ════════════════════════════════════════════
  // SCREEN: MAIN MENU
  // ════════════════════════════════════════════
  if (screen === 'menu') return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Header title="" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

        {/* Section: Davening */}
        <div style={{ fontSize: '0.65rem', color: C.gold, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px', marginTop: '8px' }}>— Davening —</div>
        {DAVENING_MENU.slice(0, 2).map(p => (
          <div key={p.slug} onClick={() => p.available && openPrayer(p.slug)} style={menuItemStyle(p.available)}
            onMouseEnter={e => { if(p.available)(e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,168,75,0.5)'; }}
            onMouseLeave={e => { if(p.available)(e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,168,75,0.25)'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.available ? C.gold : C.inkDim, boxShadow: p.available ? `0 0 8px ${C.gold}` : 'none' }} />
              <div>
                <div style={{ fontFamily: 'serif', fontSize: '1.2rem', color: p.available ? C.gold : C.ink, direction: 'rtl' }}>{p.nameHeb}</div>
                <div style={{ fontSize: '0.72rem', color: C.inkDim, fontFamily: 'sans-serif' }}>{p.nameEn} · {p.time}</div>
              </div>
            </div>
            {p.available
              ? <div style={{ fontSize: '0.62rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,168,75,0.15)', color: C.gold, border: `1px solid rgba(200,168,75,0.3)`, fontFamily: 'sans-serif' }}>Open ▶</div>
              : <div style={{ fontSize: '0.6rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(100,100,100,0.1)', color: C.inkDim, border: `1px solid rgba(100,100,100,0.2)`, fontFamily: 'sans-serif' }}>Soon</div>
            }
          </div>
        ))}

        {/* More Davening - Coming Soon */}
        {DAVENING_MENU.slice(2).map(p => (
          <div key={p.slug} style={menuItemStyle(false)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.inkDim }} />
              <div>
                <div style={{ fontFamily: 'serif', fontSize: '1.2rem', color: C.ink, direction: 'rtl' }}>{p.nameHeb}</div>
                <div style={{ fontSize: '0.72rem', color: C.inkDim, fontFamily: 'sans-serif' }}>{p.nameEn} · {p.time}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.6rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(100,100,100,0.1)', color: C.inkDim, border: `1px solid rgba(100,100,100,0.2)`, fontFamily: 'sans-serif' }}>Soon</div>
          </div>
        ))}

        {/* Section: Torah */}
        <div style={{ fontSize: '0.65rem', color: C.gold, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px', marginTop: '24px' }}>— Torah —</div>
        {TORAH_MENU.map(sefer => (
          <div key={sefer.seferEn} onClick={() => { setSelectedSefer(sefer); setScreen('sefer-menu'); }}
            style={{ ...menuItemStyle(true), cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,168,75,0.5)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,168,75,0.25)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.gold, boxShadow: `0 0 8px ${C.gold}` }} />
              <div>
                <div style={{ fontFamily: 'serif', fontSize: '1.2rem', color: C.gold, direction: 'rtl' }}>{sefer.sefer}</div>
                <div style={{ fontSize: '0.72rem', color: C.inkDim, fontFamily: 'sans-serif' }}>{sefer.seferEn} · {sefer.parshiyos.length} Parshiyos</div>
              </div>
            </div>
            <div style={{ fontSize: '0.62rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,168,75,0.15)', color: C.gold, border: `1px solid rgba(200,168,75,0.3)`, fontFamily: 'sans-serif' }}>Open ▶</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════
  // SCREEN: SEFER MENU (list of parshiyos)
  // ════════════════════════════════════════════
  if (screen === 'sefer-menu' && selectedSefer) return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Header title={selectedSefer.seferEn} onBack={() => setScreen('menu')} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: '0.65rem', color: C.gold, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
          — {selectedSefer.seferEn} · {selectedSefer.parshiyos.length} Parshiyos —
        </div>
        {selectedSefer.parshiyos.map((p, i) => (
          <div key={p.slug} onClick={() => openParsha(p.slug)}
            style={{ ...menuItemStyle(true), cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,168,75,0.5)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,168,75,0.25)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(200,168,75,0.15)', border: `1px solid rgba(200,168,75,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: C.gold, fontFamily: 'sans-serif', flexShrink: 0 }}>{i+1}</div>
              <div>
                <div style={{ fontFamily: 'serif', fontSize: '1.2rem', color: C.gold, direction: 'rtl' }}>{p.nameHeb}</div>
                <div style={{ fontSize: '0.72rem', color: C.inkDim, fontFamily: 'sans-serif' }}>{p.nameEn}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.62rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,168,75,0.15)', color: C.gold, border: `1px solid rgba(200,168,75,0.3)`, fontFamily: 'sans-serif' }}>Read ▶</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════
  // SCREEN: LOADING
  // ════════════════════════════════════════════
  if (screen === 'loading') {
    const loadingName = [...DAVENING_MENU, ...TORAH_MENU.flatMap(s => s.parshiyos)].find(p => p.slug === selectedSlug);
    return (
      <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '3rem', color: C.gold, animation: 'pulse 1.5s infinite' }}>✡</div>
        <div style={{ fontFamily: 'serif', fontSize: '1.4rem', color: C.gold, direction: 'rtl' }}>{loadingName?.nameHeb || ''}</div>
        <div style={{ fontSize: '0.72rem', color: C.inkDim, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Loading...</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, opacity: 0.3, animation: `dot 0.8s ${i*0.2}s infinite alternate` }} />)}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.95)}}@keyframes dot{from{opacity:0.2}to{opacity:1}}`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // SCREEN: SIDDUR / TORAH READER
  // ════════════════════════════════════════════
  const currentPageData = pages[currentPage];
  const isTorah = pageMode === 'torah';

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', userSelect: 'none' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* TOP BAR */}
      <div style={{ background: C.panel, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => { pause(); setScreen(isTorah ? 'sefer-menu' : 'menu'); }}
          style={{ background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'sans-serif', padding: '4px 8px' }}>
          ← {isTorah ? selectedSefer?.seferEn : 'Menu'}
        </button>
        <div style={{ fontFamily: 'serif', color: C.gold, fontSize: '1rem', direction: 'rtl' }}>{selectedPrayer?.nameHeb || ''}</div>
        <button onClick={() => setIsDark(!isDark)} style={{ background: 'transparent', border: 'none', color: C.inkDim, cursor: 'pointer', fontSize: '1rem' }}>
          {isDark ? '☀' : '🌙'}
        </button>
      </div>

      {/* BOOK */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: 'min(680px, 96vw)', maxHeight: 'calc(100dvh - 190px)', display: 'flex', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', borderRadius: '2px 6px 6px 2px', overflow: 'hidden', transform: flipping === 'forward' ? 'perspective(1200px) rotateY(-4deg)' : flipping === 'back' ? 'perspective(1200px) rotateY(4deg)' : 'none', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
          <div style={{ width: '22px', background: `linear-gradient(to right, ${C.spine}, #2a1f0e, ${C.spine})`, flexShrink: 0, boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.4)' }} />
          <div style={{ flex: 1, background: C.paper, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Page header */}
            <div style={{ textAlign: 'center', padding: '12px 16px 8px', borderBottom: `1px solid ${isDark ? 'rgba(200,168,75,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
              <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${C.gold}, transparent)`, marginBottom: '6px', opacity: 0.4 }} />
              {pageMode === 'onePerSection' && selectedPrayer?.sections[currentPage] && (
                <div style={{ fontFamily: 'serif', fontSize: '0.85rem', color: C.gold, marginBottom: '3px' }}>
                  {selectedPrayer.sections[currentPage].titleEn}
                </div>
              )}
              <div style={{ fontSize: '0.58rem', color: C.inkDim, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                {pageMode === 'onePerSection' ? `Beracha ${currentPage+1} of ${pages.length}` : `Page ${currentPage+1} of ${pages.length}`}
              </div>
            </div>

            {/* Lines */}
            <div style={{ padding: '12px 20px 20px', flex: 1 }}>
              {currentPageData?.lines.map((lineData, li) => {
                const lineStartGlobal = (() => {
                  let count = 0;
                  for (let p = 0; p < currentPage; p++) pages[p].lines.forEach(l => count += l.words.length);
                  for (let l = 0; l < li; l++) count += currentPageData.lines[l].words.length;
                  return count;
                })();
                return (
                  <div key={lineData.lineKey} style={{ marginBottom: '14px' }}>
                    {/* Pasuk label for Torah */}
                    {isTorah && lineData.translation && (
                      <div style={{ fontSize: '0.58rem', color: C.gold, fontFamily: 'sans-serif', marginBottom: '3px', opacity: 0.7, letterSpacing: '0.05em' }}>
                        {lineData.translation}
                      </div>
                    )}
                    {/* Hebrew words */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 4px', justifyContent: 'flex-end', direction: 'rtl', marginBottom: isTorah ? '2px' : '6px' }}>
                      {lineData.words.map((word, wi) => {
                        const gIdx = lineStartGlobal + wi;
                        const isActive = gIdx === activeIdx;
                        const isPast = gIdx < activeIdx;
                        return (
                          <span key={wi} ref={isActive ? activeWordRef : null} onClick={() => word.start > 0 && seekToWord(word.start)}
                            style={{ fontFamily: '"Noto Serif Hebrew", serif', fontSize: isTorah ? '1.3rem' : '1.45rem', padding: '2px 4px', borderRadius: '4px', cursor: word.start > 0 ? 'pointer' : 'default', direction: 'rtl', display: 'inline-block', transition: 'all 0.22s ease', color: isActive ? (isDark ? '#ffd060' : '#7a4a00') : isPast ? C.inkDim : C.ink, textShadow: isActive ? `0 0 14px ${C.goldG}, 0 0 30px rgba(200,168,75,0.4)` : 'none', transform: isActive ? 'scale(1.12)' : 'scale(1)', background: isActive ? 'rgba(200,168,75,0.13)' : 'transparent', fontWeight: isActive ? '600' : '400' }}>
                            {word.text}
                          </span>
                        );
                      })}
                    </div>
                    {!isTorah && lineData.translation && (
                      <div style={{ fontSize: '0.76rem', color: C.inkDim, fontFamily: 'sans-serif', fontWeight: '300', lineHeight: '1.5', paddingLeft: '4px', borderLeft: `2px solid rgba(200,168,75,0.2)`, marginLeft: '4px', direction: 'ltr' }}>
                        {lineData.translation}
                      </div>
                    )}
                    {li < currentPageData.lines.length - 1 && (
                      <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', margin: '6px 0 0' }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.58rem', color: C.inkDim, fontFamily: 'sans-serif' }}>{currentPage+1}</div>
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

      {/* AUDIO */}
      <audio ref={audioRef} src={selectedPrayer?.audioUrl || ''}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); cancelAnimationFrame(rafRef.current); }} />

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
          {!isTorah ? (
            <div style={{ display: 'flex', gap: '3px' }}>
              {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
                <button key={s} onClick={() => changeSpeed(s)} style={{ padding: '3px 7px', borderRadius: '10px', background: speed === s ? 'rgba(200,168,75,0.2)' : 'transparent', border: `1px solid ${speed === s ? 'rgba(200,168,75,0.5)' : 'rgba(200,168,75,0.12)'}`, color: speed === s ? C.gold : C.inkDim, fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'sans-serif' }}>{s}×</button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.68rem', color: C.inkDim, fontFamily: 'sans-serif' }}>
              <span style={{ color: C.gold }}>Audio coming soon</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isTorah && <button onClick={() => { if(audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime-5); }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid rgba(200,168,75,0.2)`, color: C.gold, cursor: 'pointer', fontSize: '0.8rem' }}>⏮</button>}
            {!isTorah && (
              <button onClick={isPlaying ? pause : play} style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.gold, border: 'none', color: '#0d0a06', fontSize: '1.2rem', cursor: 'pointer', boxShadow: `0 0 20px rgba(200,168,75,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
            )}
            {!isTorah && <button onClick={() => { if(audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime+5); }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'transparent', border: `1px solid rgba(200,168,75,0.2)`, color: C.gold, cursor: 'pointer', fontSize: '0.8rem' }}>⏭</button>}
            {isTorah && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => flipPage('back')} disabled={currentPage === 0} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(200,168,75,0.1)', border: `1px solid rgba(200,168,75,0.25)`, color: C.gold, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'sans-serif', opacity: currentPage === 0 ? 0.4 : 1 }}>◀ Prev</button>
                <button onClick={() => flipPage('forward')} disabled={currentPage === pages.length-1} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(200,168,75,0.1)', border: `1px solid rgba(200,168,75,0.25)`, color: C.gold, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'sans-serif', opacity: currentPage === pages.length-1 ? 0.4 : 1 }}>Next ▶</button>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', color: C.inkDim, textAlign: 'right', fontFamily: 'sans-serif' }}>
            <div style={{ color: 'rgba(200,168,75,0.7)', fontWeight: '500' }}>{selectedPrayer?.nameHeb || ''}</div>
            <div>{isTorah ? 'Torah' : 'Ashkenaz'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
