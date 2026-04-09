import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  WeekPlan,
  WorkoutRecord,
  BodyRecord,
  HealthSettings,
  HealthSyncState,
  DayRoutine,
  WorkoutExercise,
} from '../types/health';

interface HealthContextType {
  session: Session | null;
  user: User | null;
  syncState: HealthSyncState;
  weekPlans: WeekPlan[];
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
  getCurrentWeekPlan: () => WeekPlan | undefined;
  updateDayRoutine: (weekNumber: number, dayOfWeek: number, routine: Partial<DayRoutine>) => Promise<void>;
  addExerciseToDayRoutine: (weekNumber: number, dayOfWeek: number, exercise: Omit<WorkoutExercise, 'id' | 'order'>) => Promise<void>;
  removeExerciseFromDayRoutine: (weekNumber: number, dayOfWeek: number, exerciseId: string) => Promise<void>;
  updateExerciseInDayRoutine: (weekNumber: number, dayOfWeek: number, exercise: WorkoutExercise) => Promise<void>;
  workoutRecords: WorkoutRecord[];
  addWorkoutRecord: (record: Omit<WorkoutRecord, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteWorkoutRecord: (id: string) => Promise<void>;
  getRecordsByMonth: (year: number, month: number) => WorkoutRecord[];
  getRecordByDate: (date: string) => WorkoutRecord | undefined;
  bodyRecords: BodyRecord[];
  addBodyRecord: (record: Omit<BodyRecord, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateBodyRecord: (id: string, record: Partial<BodyRecord>) => Promise<void>;
  deleteBodyRecord: (id: string) => Promise<void>;
  getLatestBodyRecord: () => BodyRecord | undefined;
  settings: HealthSettings;
  updateSettings: (settings: Partial<HealthSettings>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  manualSync: () => Promise<void>;
  getMonthlyWorkoutCount: (year: number, month: number) => number;
  getCurrentStreak: () => number;
  getTotalWorkoutCount: () => number;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) throw new Error('useHealth must be used within HealthProvider');
  return context;
}

const createSampleWeekPlan = (weekNumber: number): WeekPlan => ({
  id: `week-${weekNumber}`, weekNumber,
  days: Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i, isRestDay: false,
    exercises: i === 1 ? [{ id: 'ex-1', name: '벤치프레스', order: 0, sets: [{ id: 's-1', weight: 40, reps: 12, isWarmup: true, completed: false }, { id: 's-2', weight: 60, reps: 10, isWarmup: false, completed: false }, { id: 's-3', weight: 60, reps: 10, isWarmup: false, completed: false }, { id: 's-4', weight: 60, reps: 8, isWarmup: false, completed: false }] }, { id: 'ex-2', name: '덤벨 플라이', order: 1, sets: [{ id: 's-5', weight: 15, reps: 12, isWarmup: false, completed: false }, { id: 's-6', weight: 15, reps: 12, isWarmup: false, completed: false }, { id: 's-7', weight: 15, reps: 10, isWarmup: false, completed: false }] }] : i === 3 ? [{ id: 'ex-3', name: '데드리프트', order: 0, sets: [{ id: 's-8', weight: 60, reps: 8, isWarmup: false, completed: false }, { id: 's-9', weight: 80, reps: 6, isWarmup: false, completed: false }, { id: 's-10', weight: 100, reps: 5, isWarmup: false, completed: false }] }] : i === 5 ? [{ id: 'ex-4', name: '스쿼트', order: 0, sets: [{ id: 's-11', weight: 60, reps: 10, isWarmup: false, completed: false }, { id: 's-12', weight: 80, reps: 8, isWarmup: false, completed: false }, { id: 's-13', weight: 100, reps: 6, isWarmup: false, completed: false }] }, { id: 'ex-5', name: '레그프레스', order: 1, sets: [{ id: 's-14', weight: 120, reps: 12, isWarmup: false, completed: false }, { id: 's-15', weight: 140, reps: 10, isWarmup: false, completed: false }] }] : [],
  })),
  userId: 'local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

export function HealthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<HealthSyncState>({ status: 'synced', lastSync: null, error: null });
  const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [settings, setSettings] = useState<HealthSettings>({ name: '', theme: 'slate', dynamicAccent: 'orange', dynamicAccentDark: 'orange', isDarkMode: false, defaultRestTime: 90, height: 175, groqApiKey: '' });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      loadDataFromLocal();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await loadDataFromCloud(session.user.id);
      setIsInitialized(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await loadDataFromCloud(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadDataFromLocal = () => {
    try {
      const storedPlans = localStorage.getItem('health_week_plans');
      const storedRecords = localStorage.getItem('health_workout_records');
      const storedBody = localStorage.getItem('health_body_records');
      const storedSettings = localStorage.getItem('health_settings');
      const storedCurrentWeek = localStorage.getItem('health_current_week');

      if (storedPlans) setWeekPlans(JSON.parse(storedPlans));
      else { const initialPlans = [1, 2, 3, 4].map(createSampleWeekPlan); setWeekPlans(initialPlans); localStorage.setItem('health_week_plans', JSON.stringify(initialPlans)); }
      if (storedRecords) setWorkoutRecords(JSON.parse(storedRecords));
      if (storedBody) setBodyRecords(JSON.parse(storedBody));
      if (storedSettings) setSettings(JSON.parse(storedSettings));
      if (storedCurrentWeek) setCurrentWeek(Number(storedCurrentWeek));
    } catch (error) { console.error('Failed to load from localStorage:', error); }
  };

  const loadDataFromCloud = async (userId: string) => {
    setSyncState({ status: 'syncing', lastSync: syncState.lastSync, error: null });
    try {
      const [recordsRes, bodyRes, weekPlansRes] = await Promise.all([
        supabase.from('workout_records').select('*').eq('user_id', userId),
        supabase.from('body_records').select('*').eq('user_id', userId),
        supabase.from('week_plans').select('*').eq('user_id', userId),
      ]);

      if (recordsRes.data) {
        const cloudRecords = recordsRes.data.map(r => ({ id: r.id, userId: r.user_id, date: r.date, dayOfWeek: r.day_of_week, totalVolume: r.total_volume, exercises: r.exercises, createdAt: r.created_at, updatedAt: r.updated_at }));
        if (cloudRecords.length > 0) { setWorkoutRecords(cloudRecords); localStorage.setItem('health_workout_records', JSON.stringify(cloudRecords)); }
      }

      if (bodyRes.data) {
        const cloudBody = bodyRes.data.map(r => ({ id: r.id, userId: r.user_id, date: r.date, weight: r.weight, muscleMass: r.muscle_mass, bodyFat: r.body_fat, bodyFatMass: r.body_fat_mass, bmi: r.bmi, visceralFat: r.visceral_fat, createdAt: r.created_at }));
        if (cloudBody.length > 0) { setBodyRecords(cloudBody); localStorage.setItem('health_body_records', JSON.stringify(cloudBody)); }
      }

      if (weekPlansRes.data && weekPlansRes.data.length > 0) {
        const cloudPlans = weekPlansRes.data.map(p => ({ id: p.id, weekNumber: p.week_number, days: p.days, userId: p.user_id, createdAt: p.created_at, updatedAt: p.updated_at }));
        setWeekPlans(cloudPlans);
        localStorage.setItem('health_week_plans', JSON.stringify(cloudPlans));
      }

      setSyncState({ status: 'synced', lastSync: new Date().toISOString(), error: null });
    } catch (error) {
      console.error('Cloud load error:', error);
      setSyncState({ status: 'error', lastSync: syncState.lastSync, error: '클라우드에서 데이터를 불러오지 못했습니다' });
    }
  };

  const saveToLocal = (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (error) { console.error('Failed to save to localStorage:', error); }
  };

  const getCurrentWeekPlan = () => weekPlans.find(plan => plan.weekNumber === currentWeek);

  const updateDayRoutine = async (weekNumber: number, dayOfWeek: number, routine: Partial<DayRoutine>) => {
    const updated = weekPlans.map(plan => plan.weekNumber === weekNumber ? { ...plan, days: plan.days.map(day => day.dayOfWeek === dayOfWeek ? { ...day, ...routine } : day), updatedAt: new Date().toISOString() } : plan);
    setWeekPlans(updated);
    saveToLocal('health_week_plans', updated);
    if (user) {
      const plan = updated.find(p => p.weekNumber === weekNumber);
      if (plan) {
        await supabase.from('week_plans').upsert({ id: plan.id, user_id: user.id, week_number: plan.weekNumber, days: plan.days, updated_at: new Date().toISOString() });
      }
    }
  };

  const addExerciseToDayRoutine = async (weekNumber: number, dayOfWeek: number, exercise: Omit<WorkoutExercise, 'id' | 'order'>) => {
    const updated = weekPlans.map(plan => {
      if (plan.weekNumber === weekNumber) {
        return { ...plan, days: plan.days.map(day => day.dayOfWeek === dayOfWeek ? { ...day, exercises: [...day.exercises, { ...exercise, id: crypto.randomUUID(), order: day.exercises.length }] } : day), updatedAt: new Date().toISOString() };
      }
      return plan;
    });
    setWeekPlans(updated);
    saveToLocal('health_week_plans', updated);
    if (user) {
      const plan = updated.find(p => p.weekNumber === weekNumber);
      if (plan) {
        await supabase.from('week_plans').upsert({ id: plan.id, user_id: user.id, week_number: plan.weekNumber, days: plan.days, updated_at: new Date().toISOString() });
      }
    }
  };

  const removeExerciseFromDayRoutine = async (weekNumber: number, dayOfWeek: number, exerciseId: string) => {
    const updated = weekPlans.map(plan => plan.weekNumber === weekNumber
      ? { ...plan, days: plan.days.map(day => day.dayOfWeek === dayOfWeek ? { ...day, exercises: day.exercises.filter(ex => ex.id !== exerciseId) } : day), updatedAt: new Date().toISOString() }
      : plan);
    setWeekPlans(updated);
    saveToLocal('health_week_plans', updated);
    if (user) {
      const plan = updated.find(p => p.weekNumber === weekNumber);
      if (plan) await supabase.from('week_plans').upsert({ id: plan.id, user_id: user.id, week_number: plan.weekNumber, days: plan.days, updated_at: new Date().toISOString() });
    }
  };

  const updateExerciseInDayRoutine = async (weekNumber: number, dayOfWeek: number, exercise: WorkoutExercise) => {
    const updated = weekPlans.map(plan => plan.weekNumber === weekNumber
      ? { ...plan, days: plan.days.map(day => day.dayOfWeek === dayOfWeek ? { ...day, exercises: day.exercises.map(ex => ex.id === exercise.id ? exercise : ex) } : day), updatedAt: new Date().toISOString() }
      : plan);
    setWeekPlans(updated);
    saveToLocal('health_week_plans', updated);
    if (user) {
      const plan = updated.find(p => p.weekNumber === weekNumber);
      if (plan) await supabase.from('week_plans').upsert({ id: plan.id, user_id: user.id, week_number: plan.weekNumber, days: plan.days, updated_at: new Date().toISOString() });
    }
  };

  const addWorkoutRecord = async (record: Omit<WorkoutRecord, 'id' | 'userId' | 'createdAt'>) => {
    const newRecord: WorkoutRecord = { ...record, id: crypto.randomUUID(), userId: user?.id || 'local', createdAt: new Date().toISOString() };
    const updated = [...workoutRecords, newRecord];
    setWorkoutRecords(updated);
    saveToLocal('health_workout_records', updated);
    if (user) {
      await supabase.from('workout_records').insert({ id: newRecord.id, user_id: user.id, date: newRecord.date, day_of_week: newRecord.dayOfWeek, total_volume: newRecord.totalVolume, exercises: newRecord.exercises });
    }
  };

  const deleteWorkoutRecord = async (id: string) => {
    const updated = workoutRecords.filter(r => r.id !== id);
    setWorkoutRecords(updated);
    saveToLocal('health_workout_records', updated);
    if (user) await supabase.from('workout_records').delete().eq('id', id);
  };

  const getRecordsByMonth = (year: number, month: number) => workoutRecords.filter(record => { const recordDate = new Date(record.date); return recordDate.getFullYear() === year && recordDate.getMonth() === month; });

  const getRecordByDate = (date: string) => workoutRecords.find(record => record.date === date);

  const addBodyRecord = async (record: Omit<BodyRecord, 'id' | 'userId' | 'createdAt'>) => {
    const newRecord: BodyRecord = { ...record, id: crypto.randomUUID(), userId: user?.id || 'local', createdAt: new Date().toISOString() };
    const updated = [...bodyRecords, newRecord];
    setBodyRecords(updated);
    saveToLocal('health_body_records', updated);
    if (user) {
      await supabase.from('body_records').insert({ id: newRecord.id, user_id: user.id, date: newRecord.date, weight: newRecord.weight, muscle_mass: newRecord.muscleMass, body_fat: newRecord.bodyFat, body_fat_mass: newRecord.bodyFatMass, bmi: newRecord.bmi, visceral_fat: newRecord.visceralFat });
    }
  };

  const updateBodyRecord = async (id: string, record: Partial<BodyRecord>) => {
    const updated = bodyRecords.map(r => r.id === id ? { ...r, ...record } : r);
    setBodyRecords(updated);
    saveToLocal('health_body_records', updated);
    if (user) {
      const dbUpdates: any = {};
      if (record.weight !== undefined) dbUpdates.weight = record.weight;
      if (record.muscleMass !== undefined) dbUpdates.muscle_mass = record.muscleMass;
      if (record.bodyFat !== undefined) dbUpdates.body_fat = record.bodyFat;
      if (record.bodyFatMass !== undefined) dbUpdates.body_fat_mass = record.bodyFatMass;
      if (record.bmi !== undefined) dbUpdates.bmi = record.bmi;
      if (record.visceralFat !== undefined) dbUpdates.visceral_fat = record.visceralFat;
      if (Object.keys(dbUpdates).length > 0) await supabase.from('body_records').update(dbUpdates).eq('id', id);
    }
  };

  const deleteBodyRecord = async (id: string) => {
    const updated = bodyRecords.filter(r => r.id !== id);
    setBodyRecords(updated);
    saveToLocal('health_body_records', updated);
    if (user) await supabase.from('body_records').delete().eq('id', id);
  };

  const getLatestBodyRecord = () => bodyRecords.length > 0 ? bodyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : undefined;

  const updateSettings = async (newSettings: Partial<HealthSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveToLocal('health_settings', updated);
  };

  const signInWithGoogle = async () => { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } }); };
  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setUser(null); };
  const manualSync = async () => { if (!user) return; setSyncState({ status: 'syncing', lastSync: null, error: null }); try { await loadDataFromCloud(user.id); setSyncState({ status: 'synced', lastSync: new Date(), error: null }); } catch (error) { setSyncState({ status: 'error', lastSync: null, error: String(error) }); } };

  const getMonthlyWorkoutCount = (year: number, month: number) => getRecordsByMonth(year, month).length;

  const getCurrentStreak = () => {
    if (workoutRecords.length === 0) return 0;
    const sortedRecords = [...workoutRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    let checkDate = new Date(); checkDate.setHours(0, 0, 0, 0);
    for (const record of sortedRecords) {
      const recordDate = new Date(record.date); recordDate.setHours(0, 0, 0, 0);
      if (recordDate.getTime() === checkDate.getTime()) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (recordDate.getTime() < checkDate.getTime()) break;
    }
    return streak;
  };

  const getTotalWorkoutCount = () => workoutRecords.length;

  return (
    <HealthContext.Provider value={{ session, user, syncState, weekPlans, currentWeek, setCurrentWeek: (week) => { setCurrentWeek(week); saveToLocal('health_current_week', week); }, getCurrentWeekPlan, updateDayRoutine, addExerciseToDayRoutine, removeExerciseFromDayRoutine, updateExerciseInDayRoutine, workoutRecords, addWorkoutRecord, deleteWorkoutRecord, getRecordsByMonth, getRecordByDate, bodyRecords, addBodyRecord, updateBodyRecord, deleteBodyRecord, getLatestBodyRecord, settings, updateSettings, signInWithGoogle, signOut, manualSync, getMonthlyWorkoutCount, getCurrentStreak, getTotalWorkoutCount }}>
      {children}
    </HealthContext.Provider>
  );
}
