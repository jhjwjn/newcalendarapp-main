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

// CalendarEvent는 Event의 별칭
export type CalendarEvent = Event;

export interface Note {
  id: string;
  content: string;
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

// Flashcard는 FlashCard의 별칭
export type Flashcard = FlashCard;

// FlashcardDeck 추가
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

export interface UserSettings {
  name: string;
  theme: 'slate' | 'forest' | 'amber' | 'rose' | 'mono' | 'white';
  glassAccent?: 'blue' | 'purple' | 'peach' | 'black'; // Glass 테마 악센트 색상 (라이트모드)
  glassAccentDark?: 'blue' | 'purple' | 'peach' | 'black'; // Glass 테마 악센트 색상 (다크모드)
  isDarkMode?: boolean; // 다크모드 설정
  groqApiKey: string;
}

export type PlannerSettings = UserSettings;

export interface SyncState {
  status: 'syncing' | 'synced' | 'error';
  lastSync: string | null;
  error: string | null;
}
