/**
 * HebrewWord.tsx — Single Hebrew word with three visual states:
 *   future (dim) | active (gold glow, scaled) | past (faded)
 */
'use client';
import { memo } from 'react';

interface Props {
  text: string;
  state: 'future' | 'active' | 'past';
  transliteration?: string;
  showTranslit?: boolean;
  onClick?: () => void;
}

const HebrewWord = memo(function HebrewWord({ text, state, transliteration, showTranslit, onClick }: Props) {
  return (
    <span className={`heb-word heb-word--${state}`} onClick={onClick} dir="rtl" title={transliteration}>
      {text}
      {showTranslit && transliteration && <span className="heb-word__translit">{transliteration}</span>}
    </span>
  );
});

export default HebrewWord;
