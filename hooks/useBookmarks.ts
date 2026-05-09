'use client';
import { useCallback } from 'react';
import { UserBookmark } from '../types';

export function useBookmarks(prayerId: string) {
  const key = `davenAlong_bm_${prayerId}`;

  const save = useCallback(async (bm: Omit<UserBookmark, 'prayerId' | 'savedAt'>) => {
    const full = { ...bm, prayerId, savedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(full));
    try { await fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(full) }); }
    catch { /* offline ok */ }
  }, [prayerId, key]);

  const load = useCallback((): UserBookmark | null => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
  }, [key]);

  return { save, load };
}
