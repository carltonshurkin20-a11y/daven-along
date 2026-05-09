/**
 * useSyncEngine.ts — Master orchestration hook
 *
 * Connects: audio time → word highlight → section highlight → page flip
 * Called every ~16ms by the RAF loop in useAudioPlayer.
 */
'use client';
import { useState, useCallback, useRef } from 'react';
import { findActiveWord, FlatWord } from '../lib/timingSearch';

interface UseSyncEngineOptions {
  words: FlatWord[];
  wordsPerPage?: number;
  onPageChange?: (page: number) => void;
}

export function useSyncEngine({ words, wordsPerPage = 80, onPageChange }: UseSyncEngineOptions) {
  const [activeWordIndex,    setActiveWordIndex]    = useState(-1);
  const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
  const prevIdxRef = useRef(-1);

  const onTimeUpdate = useCallback((currentTime: number) => {
    const newIdx = findActiveWord(words, currentTime);
    if (newIdx === prevIdxRef.current) return; // no change — skip re-render
    prevIdxRef.current = newIdx;
    setActiveWordIndex(newIdx);
    if (newIdx >= 0) {
      setActiveSectionIndex(words[newIdx].sectionIdx);
      const newPage = Math.floor(newIdx / wordsPerPage);
      onPageChange?.(newPage);
    }
  }, [words, wordsPerPage, onPageChange]);

  const reset = useCallback(() => {
    prevIdxRef.current = -1;
    setActiveWordIndex(-1);
    setActiveSectionIndex(-1);
  }, []);

  return { onTimeUpdate, activeWordIndex, activeSectionIndex, reset };
}
