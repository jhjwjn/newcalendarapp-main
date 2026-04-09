import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getDailyInspiration } from '../lib/ai/dailyInspiration';
import {
  CalendarEvent,
  Category,
  Flashcard,
  Habit,
  HabitRecord,
  Note,
  PlannerSettings,
  StudySession,
  SyncState,
} from '../types/planner';
import { addDays, format } from 'date-fns';

interface PlannerContextType {
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncState: SyncState;
  manualSync: () => Promise<void>;

  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  notes: Note[];
  addNote: (content: string, title?: string) => Promise<void>;
  updateNote: (id: string, content: string, title?: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  pinNote: (id: string, pinned: boolean) => Promise<void>;

  flashCards: Flashcard[];
  studySessions: StudySession[];
  recordStudySession: (cardsStudied: number, correctAnswers: number) => void;

  studyMode: 'flashcard' | 'review' | 'opic' | 'writing' | 'history';
  setStudyMode: (mode: 'flashcard' | 'review' | 'opic' | 'writing' | 'history') => void;

  // Habits
  habits: Habit[];
  habitRecords: HabitRecord[];
  addHabit: (habit: Omit<Habit, 'id' | 'userId' | 'createdAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitRecord: (habitId: string, date: string) => void;
  getHabitCompletedDates: (habitId: string) => string[];

  settings: PlannerSettings;
  updateSettings: (updates: Partial<PlannerSettings>) => Promise<void>;

  todayBriefing: string;
  refreshBriefing: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextType | null>(null);

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '업무', color: '#3b82f6', emoji: '💼' },
  { id: 'cat-2', name: '개인', color: '#10b981', emoji: '🌟' },
  { id: 'cat-3', name: '운동', color: '#ef4444', emoji: '💪' },
  { id: 'cat-4', name: '공부', color: '#f59e0b', emoji: '📚' },
  { id: 'cat-5', name: '시험', color: '#8b5cf6', emoji: '📝' },
];

const SAMPLE_FLASHCARDS: Flashcard[] = [
  { id: 'fc-1', front: 'ambitious', back: '야심찬, 의욕적인', example: 'She is an ambitious student who wants to become a doctor.' },
  { id: 'fc-2', front: 'magnificent', back: '장엄한, 훌륭한', example: 'The view from the mountain was magnificent.' },
  { id: 'fc-3', front: 'reluctant', back: '꺼리는, 주저하는', example: 'He was reluctant to ask for help.' },
  { id: 'fc-4', front: 'substantial', back: '상당한, 실질적인', example: 'There was a substantial increase in sales.' },
  { id: 'fc-5', front: 'inevitable', back: '불가피한, 필연적인', example: 'Change is inevitable in life.' },
  { id: 'fc-6', front: 'perseverance', back: '인내, 끈기', example: 'Success comes from perseverance and hard work.' },
  { id: 'fc-7', front: 'eloquent', back: '유창한, 설득력 있는', example: 'She gave an eloquent speech at the ceremony.' },
  { id: 'fc-8', front: 'diligent', back: '부지런한, 성실한', example: 'He is a diligent student who never misses class.' },
];

const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: 'evt-1', title: '프로젝트 미팅', date: format(new Date(), 'yyyy-MM-dd'), startTime: '10:00', endTime: '11:30', categoryId: 'cat-1', memo: '분기 계획 논의', userId: 'local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'evt-2', title: '점심 약속', date: format(new Date(), 'yyyy-MM-dd'), startTime: '12:30', endTime: '14:00', categoryId: 'cat-2', memo: '강남역 파스타집', userId: 'local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'evt-3', title: '헬스장', date: format(addDays(new Date(), 1), 'yyyy-MM-dd'), startTime: '19:00', endTime: '20:30', categoryId: 'cat-3', memo: '상체 운동', userId: 'local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'evt-4', title: '영어 스터디', date: format(addDays(new Date(), 2), 'yyyy-MM-dd'), startTime: '14:00', endTime: '16:00', categoryId: 'cat-4', memo: 'Chapter 5 복습', userId: 'local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'evt-5', title: '중간고사', date: format(addDays(new Date(), 5), 'yyyy-MM-dd'), startTime: '09:00', endTime: '11:00', categoryId: 'cat-5', memo: '경영학원론', userId: 'local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const SAMPLE_NOTES: Note[] = [
  { id: 'note-1', title: '프레젠테이션 준비', content: '다음 주 프레젠테이션 준비:\n- 슬라이드 30장 목표\n- 시연 영상 촬영\n- 발표 연습 3회 이상', pinned: true, userId: 'local', createdAt: addDays(new Date(), -1).toISOString(), updatedAt: addDays(new Date(), -1).toISOString() },
  { id: 'note-2', title: '읽고 싶은 책', content: '1. 아침 루틴의 힘\n2. 습관의 힘\n3. 1만 시간의 재발견', userId: 'local', createdAt: addDays(new Date(), -3).toISOString(), updatedAt: addDays(new Date(), -3).toISOString() },
  { id: 'note-3', title: '장보기 목록', content: '우유, 계란, 빵, 사과, 닭가슴살, 샐러드, 요거트', userId: 'local', createdAt: addDays(new Date(), -5).toISOString(), updatedAt: addDays(new Date(), -5).toISOString() },
];

const DEFAULT_HABITS: Habit[] = [
  { id: 'habit-1', name: '물 2L 마시기', emoji: '💧', color: '#3b82f6', targetDays: [], userId: 'local', createdAt: new Date().toISOString() },
  { id: 'habit-2', name: '30분 독서', emoji: '📖', color: '#10b981', targetDays: [], userId: 'local', createdAt: new Date().toISOString() },
  { id: 'habit-3', name: '운동하기', emoji: '🏃', color: '#ef4444', targetDays: [1, 3, 5], userId: 'local', createdAt: new Date().toISOString() },
];

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ status: 'synced', lastSync: null, error: null });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [flashCards] = useState<Flashcard[]>(SAMPLE_FLASHCARDS);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [settings, setSettings] = useState<PlannerSettings>({
    name: '',
    theme: 'slate',
    glassAccent: 'blue',
    glassAccentDark: 'blue',
    isDarkMode: false,
    groqApiKey: '',
  });
  const [todayBriefing, setTodayBriefing] = useState('좋은 하루입니다! 오늘도 계획대로 멋지게 시작해봐요. 💪');
  const [studyMode, setStudyMode] = useState<'flashcard' | 'review' | 'opic' | 'writing' | 'history'>('flashcard');
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      loadDataFromLocal();

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadDataFromCloud(session.user.id);
      }

      setIsInitialized(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadDataFromCloud(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadDataFromLocal = () => {
    try {
      const storedEvents = localStorage.getItem('planner_events');
      const storedNotes = localStorage.getItem('planner_notes');
      const storedCategories = localStorage.getItem('planner_categories');
      const storedSettings = localStorage.getItem('planner_settings');
      const storedSessions = localStorage.getItem('planner_study_sessions');
      const storedBriefing = localStorage.getItem('planner_briefing');
      const storedHabits = localStorage.getItem('planner_habits');
      const storedHabitRecords = localStorage.getItem('planner_habit_records');

      setEvents(storedEvents ? JSON.parse(storedEvents) : SAMPLE_EVENTS);
      setNotes(storedNotes ? JSON.parse(storedNotes) : SAMPLE_NOTES);
      if (storedCategories) setCategories(JSON.parse(storedCategories));
      if (storedSettings) setSettings(JSON.parse(storedSettings));
      if (storedSessions) setStudySessions(JSON.parse(storedSessions));
      if (storedBriefing) setTodayBriefing(storedBriefing);
      setHabits(storedHabits ? JSON.parse(storedHabits) : DEFAULT_HABITS);
      setHabitRecords(storedHabitRecords ? JSON.parse(storedHabitRecords) : []);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  };

  const loadDataFromCloud = async (userId: string) => {
    setSyncState(prev => ({ ...prev, status: 'syncing', error: null }));
    try {
      const [eventsRes, notesRes, categoriesRes, profileRes] = await Promise.all([
        supabase.from('events').select('*').eq('user_id', userId),
        supabase.from('notes').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ]);

      if (eventsRes.data) {
        const cloudEvents = eventsRes.data.map(e => ({
          id: e.id, title: e.title, date: e.date, startTime: e.start_time, endTime: e.end_time,
          categoryId: e.category_id, memo: e.memo || '', repeat: e.repeat, repeatDays: e.repeat_days,
          userId: e.user_id, createdAt: e.created_at, updatedAt: e.updated_at,
        }));
        const finalEvents = cloudEvents.length > 0 ? cloudEvents : SAMPLE_EVENTS;
        setEvents(finalEvents);
        localStorage.setItem('planner_events', JSON.stringify(finalEvents));
      }

      if (notesRes.data) {
        const cloudNotes = notesRes.data.map(n => ({
          id: n.id, title: n.title, content: n.content, pinned: n.pinned,
          userId: n.user_id, createdAt: n.created_at, updatedAt: n.updated_at,
        }));
        const finalNotes = cloudNotes.length > 0 ? cloudNotes : SAMPLE_NOTES;
        setNotes(finalNotes);
        localStorage.setItem('planner_notes', JSON.stringify(finalNotes));
      }

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        const cloudCategories = categoriesRes.data.map(c => ({
          id: c.id, name: c.name, color: c.color, emoji: c.emoji,
        }));
        setCategories(cloudCategories);
        localStorage.setItem('planner_categories', JSON.stringify(cloudCategories));
      }

      if (profileRes.data) {
        const profileSettings: Partial<PlannerSettings> = {
          name: profileRes.data.name || '',
          theme: profileRes.data.theme || 'slate',
          groqApiKey: profileRes.data.groq_api_key || '',
        };
        setSettings(prev => {
          const updated = { ...prev, ...profileSettings };
          localStorage.setItem('planner_settings', JSON.stringify(updated));
          return updated;
        });
      }

      setSyncState({ status: 'synced', lastSync: new Date().toISOString(), error: null });
    } catch (error) {
      console.error('Cloud load error:', error);
      setSyncState(prev => ({ ...prev, status: 'error', error: '클라우드에서 데이터를 불러오지 못했습니다' }));
    }
  };

  // Auto-save to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('planner_events', JSON.stringify(events));
      localStorage.setItem('planner_notes', JSON.stringify(notes));
      localStorage.setItem('planner_categories', JSON.stringify(categories));
      localStorage.setItem('planner_settings', JSON.stringify(settings));
      localStorage.setItem('planner_study_sessions', JSON.stringify(studySessions));
      localStorage.setItem('planner_briefing', todayBriefing);
      localStorage.setItem('planner_habits', JSON.stringify(habits));
      localStorage.setItem('planner_habit_records', JSON.stringify(habitRecords));
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [events, notes, categories, settings, studySessions, todayBriefing, habits, habitRecords, isInitialized]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) console.error('Login error:', error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const manualSync = async () => {
    if (!user) return;
    await loadDataFromCloud(user.id);
  };

  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      userId: user?.id || 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEvents(current => [...current, newEvent]);
    if (user) {
      await supabase.from('events').insert({
        id: newEvent.id, user_id: user.id, title: newEvent.title, date: newEvent.date,
        start_time: newEvent.startTime, end_time: newEvent.endTime,
        category_id: newEvent.categoryId, memo: newEvent.memo,
        repeat: newEvent.repeat, repeat_days: newEvent.repeatDays,
      });
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(current => current.map(evt =>
      evt.id === id ? { ...evt, ...updates, updatedAt: new Date().toISOString() } : evt
    ));
    if (user) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
      if (updates.repeat !== undefined) dbUpdates.repeat = updates.repeat;
      if (updates.repeatDays !== undefined) dbUpdates.repeat_days = updates.repeatDays;
      await supabase.from('events').update(dbUpdates).eq('id', id);
    }
  };

  const deleteEvent = async (id: string) => {
    setEvents(current => current.filter(evt => evt.id !== id));
    if (user) await supabase.from('events').delete().eq('id', id);
  };

  const addNote = async (content: string, title?: string) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: title || '',
      content,
      pinned: false,
      userId: user?.id || 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    if (user) {
      await supabase.from('notes').insert({
        id: newNote.id, user_id: user.id, title: newNote.title, content: newNote.content,
      });
    }
  };

  const updateNote = async (id: string, content: string, title?: string) => {
    setNotes(prev => prev.map(note =>
      note.id === id ? { ...note, content, title: title ?? note.title, updatedAt: new Date().toISOString() } : note
    ));
    if (user) await supabase.from('notes').update({ content, title }).eq('id', id);
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (user) await supabase.from('notes').delete().eq('id', id);
  };

  const pinNote = async (id: string, pinned: boolean) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, pinned } : note));
  };

  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...categoryData, id: crypto.randomUUID() };
    setCategories(prev => [...prev, newCategory]);
    if (user) {
      await supabase.from('categories').insert({
        id: newCategory.id, user_id: user.id, name: newCategory.name,
        color: newCategory.color, emoji: newCategory.emoji,
      });
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...updates } : cat));
    if (user) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.emoji) dbUpdates.emoji = updates.emoji;
      await supabase.from('categories').update(dbUpdates).eq('id', id);
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    if (user) await supabase.from('categories').delete().eq('id', id);
  };

  const recordStudySession = (cardsStudied: number, correctAnswers: number) => {
    const today = new Date().toISOString().split('T')[0];
    const lastSession = studySessions[studySessions.length - 1];
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');

    let newStreak = 1;
    if (lastSession?.date === yesterday) newStreak = lastSession.streak + 1;
    else if (lastSession?.date === today) {
      setStudySessions(prev => prev.map(s =>
        s.date === today
          ? { ...s, cardsStudied: s.cardsStudied + cardsStudied, correctAnswers: s.correctAnswers + correctAnswers }
          : s
      ));
      return;
    }
    setStudySessions(prev => [...prev, { date: today, cardsStudied, correctAnswers, streak: newStreak }]);
  };

  // Habits
  const addHabit = (habitData: Omit<Habit, 'id' | 'userId' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      userId: user?.id || 'local',
      createdAt: new Date().toISOString(),
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setHabitRecords(prev => prev.filter(r => r.habitId !== id));
  };

  const toggleHabitRecord = (habitId: string, date: string) => {
    const exists = habitRecords.find(r => r.habitId === habitId && r.date === date);
    if (exists) {
      setHabitRecords(prev => prev.filter(r => !(r.habitId === habitId && r.date === date)));
    } else {
      const newRecord: HabitRecord = {
        id: crypto.randomUUID(),
        habitId,
        date,
        userId: user?.id || 'local',
      };
      setHabitRecords(prev => [...prev, newRecord]);
    }
  };

  const getHabitCompletedDates = (habitId: string) => {
    return habitRecords.filter(r => r.habitId === habitId).map(r => r.date);
  };

  const updateSettings = async (updates: Partial<PlannerSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    if (user) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
      if (updates.groqApiKey !== undefined) dbUpdates.groq_api_key = updates.groqApiKey;
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
      }
    }
  };

  const refreshBriefing = async () => {
    if (!settings.groqApiKey) {
      setTodayBriefing('Groq API 키를 설정탭에서 입력해주세요.');
      return;
    }
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const upcomingEvents = events
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map(e => `${e.title}(${e.date})`);
      const recentNotes = notes.slice(0, 3).map(n => n.content.substring(0, 50));
      const briefing = await getDailyInspiration(settings.groqApiKey, upcomingEvents, recentNotes);
      setTodayBriefing(briefing);
    } catch (error) {
      console.error('Briefing generation error:', error);
      setTodayBriefing('브리핑을 생성할 수 없습니다. API 키를 확인해주세요.');
    }
  };

  const value: PlannerContextType = {
    session, user, signInWithGoogle, signOut, syncState, manualSync,
    events, addEvent, updateEvent, deleteEvent,
    notes, addNote, updateNote, deleteNote, pinNote,
    categories, addCategory, updateCategory, deleteCategory,
    flashCards, studySessions, recordStudySession,
    studyMode, setStudyMode,
    habits, habitRecords, addHabit, updateHabit, deleteHabit,
    toggleHabitRecord, getHabitCompletedDates,
    settings, updateSettings,
    todayBriefing, refreshBriefing,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner must be used within PlannerProvider');
  return context;
}
