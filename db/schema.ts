/**
 * schema.ts — PostgreSQL schema via Drizzle ORM
 * Setup: npm install drizzle-orm pg && npm install -D drizzle-kit
 * Migrate: npx drizzle-kit push:pg
 */
import { pgTable, serial, text, real, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const prayers = pgTable('prayers', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameHeb: text('name_heb').notNull(),
  nameEn: text('name_en').notNull(),
  nusach: text('nusach').notNull().default('ashkenaz'),
  timeOfDay: text('time_of_day').notNull(),
  totalDuration: real('total_duration'),
  audioUrl: text('audio_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  prayerId: integer('prayer_id').references(() => prayers.id),
  orderIndex: integer('order_index').notNull(),
  titleHeb: text('title_heb').notNull(),
  titleEn: text('title_en').notNull(),
  translation: text('translation'),
});

export const wordTimings = pgTable('word_timings', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').references(() => sections.id),
  lineIndex: integer('line_index').notNull(),
  wordIndex: integer('word_index').notNull(),
  textHeb: text('text_heb').notNull(),
  startTime: real('start_time').notNull(),
  endTime: real('end_time').notNull(),
  translit: text('translit'),
});

export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  prayerId: integer('prayer_id').references(() => prayers.id),
  wordIndex: integer('word_index').notNull(),
  audioTime: real('audio_time').notNull(),
  savedAt: timestamp('saved_at').defaultNow(),
}, (t) => ({ uniq: uniqueIndex('user_prayer_idx').on(t.userId, t.prayerId) }));
