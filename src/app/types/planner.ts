// Planner 앱 타입 정의

export interface Category {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  categoryId: string;
  memo: string;
  repeat?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  repeatDays?: number[]; // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEvent = Event;

export interface Note {
  id: string;
  title?: string;
  content: string;
  pinned?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashCard {
  id: string;
  front: string; // 영어 단어
  back: string; // 뜻
  example: string; // 예문
  isCorrect?: boolean;
  lastReviewed?: string;
}

export type Flashcard = FlashCard;

export interface FlashcardDeck {
  id: string;
  name: string;
  cards: FlashCard[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  date: string;
  cardsStudied: number;
  correctAnswers: number;
  streak: number;
}

export interface StudyCardProgress {
  cardId: string;
  status: 'new' | 'review' | 'mastered';
  timesSeen: number;
  correctCount: number;
  incorrectCount: number;
  reviewStep: number;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
  masteredAt: string | null;
}

export interface DailyStudySet {
  date: string;
  cardIds: string[];
  generatedAt: string;
}

export interface StudyHistoryEntry {
  id: string;
  date: string;
  reviewedAt: string;
  cardId: string;
  front: string;
  back: string;
  example: string;
  result: 'correct' | 'incorrect';
  mode: 'daily' | 'review';
}

// 습관 추적
export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  targetDays: number[]; // 0=일, 1=월 ... 6=토 (비어있으면 매일)
  userId: string;
  createdAt: string;
}

export interface HabitRecord {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  userId: string;
}

export interface UserSettings {
  name: string;
  theme: 'slate' | 'forest' | 'amber' | 'rose' | 'mono' | 'white';
  glassAccent?: 'blue' | 'purple' | 'peach' | 'black';
  glassAccentDark?: 'blue' | 'purple' | 'peach' | 'black';
  isDarkMode?: boolean;
  groqApiKey: string;
  geminiApiKey?: string;
}

export type PlannerSettings = UserSettings;

export interface SyncState {
  status: 'syncing' | 'synced' | 'error';
  lastSync: string | null;
  error: string | null;
}
