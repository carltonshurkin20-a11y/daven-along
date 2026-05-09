/**
 * timingSearch.ts — ⭐ The core karaoke sync engine
 *
 * Binary search: given currentTime → returns activeWordIndex
 * O(log n) — runs every animation frame (~16ms) with <0.1ms cost
 */
import { WordTiming } from '../types';

export interface FlatWord extends WordTiming {
  sectionIdx: number;
  lineIdx: number;
  wordIdx: number;
  globalIdx: number;
}

/**
 * Binary search through sorted word list.
 * Returns index of word active at currentTime, or -1 if in a gap.
 */
export function findActiveWord(words: FlatWord[], currentTime: number): number {
  if (!words.length) return -1;
  let lo = 0, hi = words.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const w = words[mid];
    if (currentTime < w.start)     { hi = mid - 1; }
    else if (currentTime > w.end)  { lo = mid + 1; }
    else                            { return mid;   }  // exact hit
  }

  // In a gap — lookahead: if next word starts within 200ms, pre-highlight it
  const LOOKAHEAD = 0.2;
  if (lo < words.length && words[lo].start - currentTime <= LOOKAHEAD) {
    return lo;
  }
  return -1;
}

/** Flatten prayer sections into a single sorted word array */
export function buildFlatWordList(sections: import('../types').PrayerSection[]): FlatWord[] {
  const flat: FlatWord[] = [];
  let globalIdx = 0;
  sections.forEach((section, si) => {
    section.lines.forEach((line, li) => {
      line.words.forEach((word, wi) => {
        flat.push({ ...word, sectionIdx: si, lineIdx: li, wordIdx: wi, globalIdx });
        globalIdx++;
      });
    });
  });
  return flat;
}
