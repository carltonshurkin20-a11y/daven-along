export interface WordTiming {
  text: string;
  start: number;
  end: number;
  transliteration?: string;
}
export interface PrayerLine { words: WordTiming[]; }
export interface PrayerSection {
  id: string;
  title: string;
  titleEn: string;
  translation: string;
  lines: PrayerLine[];
}
export interface Prayer {
  id: number;
  slug: string;
  nameHeb: string;
  nameEn: string;
  nusach: string;
  timeOfDay: string;
  totalDuration: number;
  audioUrl?: string;
  sections: PrayerSection[];
}
export interface UserBookmark {
  prayerId: string;
  pageNumber: number;
  wordIndex: number;
  audioTime: number;
  savedAt: string;
}
