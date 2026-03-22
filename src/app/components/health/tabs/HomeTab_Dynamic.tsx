import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../../../context/HealthContext';
import { Calendar, Check, ChevronDown, ChevronUp, Edit2, Flame, PencilLine, Plus, Sparkles, TimerReset, TrendingUp, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { HEALTH_DYNAMIC_THEMES, HEALTH_DYNAMIC_THEMES_DARK } from '../../../styles/colorThemes';
import { syncWorkoutRecordToPlannedEvent } from '../../../lib/plannerWorkoutSync';
import { WorkoutExercise } from '../../types/health';
import { toast } from '../../../lib/toast';
import { getHealthRecommendation } from '../../../lib/ai/healthRecommendation';

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

interface HomeTabProps {
  theme: any;
  view?: 'overview' | 'workout';
}

interface WorkoutSessionState {
  active: boolean;
  exercises: WorkoutExercise[];
  exerciseIndex: number;
  setIndex: number;
  isResting: boolean;
  restLeft: number;
  pendingNext: { exerciseIndex: number; setIndex: number } | null;
  startedAt: string | null;
  finishedAt: string | null;
}

const createEmptySession = (): WorkoutSessionState => ({
  active: false,
  exercises: [],
  exerciseIndex: 0,
  setIndex: 0,
  isResting: false,
  restLeft: 0,
  pendingNext: null,
  startedAt: null,
  finishedAt: null,
});

const getDynamicTheme = (accent: 'orange' | 'red' | 'blue' | 'black', isDark = false) => {
  const colors = isDark ? HEALTH_DYNAMIC_THEMES_DARK[accent] : HEALTH_DYNAMIC_THEMES[accent];

  return {
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    accent1: colors.accent1,
    accent2: colors.accent2,
    gradientPrimary: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.tertiary} 48%, ${colors.accent1} 100%)`,
    gradientSecondary: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 42%, ${colors.accent2} 100%)`,
    gradientSoft: `linear-gradient(180deg, ${colors.primary}18 0%, ${colors.tertiary}10 55%, ${colors.accent2}10 100%)`,
    shadow: `${colors.primary}3D`,
    shadowLight: `${colors.primary}20`,
  };
};

function cloneExercises(exercises: WorkoutExercise[]) {
  return exercises.map(exercise => ({
    ...exercise,
    sets: exercise.sets.map(set => ({ ...set })),
  }));
}

function getNextSetPosition(exercises: WorkoutExercise[], exerciseIndex: number, setIndex: number) {
  const currentExercise = exercises[exerciseIndex];
  if (!currentExercise) return null;

  if (setIndex + 1 < currentExercise.sets.length) {
    return { exerciseIndex, setIndex: setIndex + 1 };
  }

  if (exerciseIndex + 1 < exercises.length) {
    return { exerciseIndex: exerciseIndex + 1, setIndex: 0 };
  }

  return null;
}

export function HomeTab({ theme, view = 'overview' }: HomeTabProps) {
  const {
    currentWeek,
    setCurrentWeek,
    getCurrentWeekPlan,
    getCurrentStreak,
    getMonthlyWorkoutCount,
    settings,
    updateDayRoutine,
    addExerciseToDayRoutine,
    addWorkoutRecord,
    workoutRecords,
  } = useHealth();

  const accentTheme = useMemo(() => {
    const accent = settings.isDarkMode ? settings.dynamicAccentDark || 'orange' : settings.dynamicAccent || 'orange';
    return getDynamicTheme(accent, settings.isDarkMode || false);
  }, [settings.dynamicAccent, settings.dynamicAccentDark, settings.isDarkMode]);

  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState('');
  const [editingRoutineName, setEditingRoutineName] = useState(false);
  const [routineNameDraft, setRoutineNameDraft] = useState('');
  const [workoutMode, setWorkoutMode] = useState<'plan' | 'start'>('plan');
  const [showRecordPanel, setShowRecordPanel] = useState(false);
  const [sessionState, setSessionState] = useState<WorkoutSessionState>(createEmptySession());
  const [aiComment, setAiComment] = useState('');
  const [isLoadingComment, setIsLoadingComment] = useState(false);

  const currentPlan = getCurrentWeekPlan();
  const selectedDayData = currentPlan?.days.find(day => day.dayOfWeek === selectedDay);
  const currentStreak = getCurrentStreak();
  const monthlyCount = getMonthlyWorkoutCount(new Date().getFullYear(), new Date().getMonth());

  const totalSets = selectedDayData?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
  const completedSets = selectedDayData?.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0) || 0;
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return workoutRecords.some(record => record.date === dateStr);
  });

  useEffect(() => {
    if (settings.groqApiKey && workoutRecords.length > 0) {
      setIsLoadingComment(true);
      getHealthRecommendation(settings.groqApiKey, workoutRecords)
        .then(comment => setAiComment(comment))
        .catch(err => console.error('AI comment error:', err))
        .finally(() => setIsLoadingComment(false));
    }
  }, [settings.groqApiKey, workoutRecords.length]);

  const routineName = selectedDayData?.routineName || `${DAYS_OF_WEEK[selectedDay]}요일 루틴`;

  const sessionExercise = sessionState.exercises[sessionState.exerciseIndex];
  const sessionSet = sessionExercise?.sets[sessionState.setIndex];
  const sessionProgress = sessionState.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) > 0
    ? Math.round((sessionState.exercises.reduce((sum, ex) => sum + ex.sets.filter(set => set.completed).length, 0) / sessionState.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)) * 100)
    : 0;

  useEffect(() => {
    if (!sessionState.active || !sessionState.isResting) return;
    const timer = window.setInterval(() => {
      setSessionState(current => {
        if (!current.active || !current.isResting) return current;
        if (current.restLeft <= 1) {
          if (!current.pendingNext) {
            return { ...current, isResting: false, restLeft: 0 };
          }
          return {
            ...current,
            isResting: false,
            restLeft: 0,
            exerciseIndex: current.pendingNext.exerciseIndex,
            setIndex: current.pendingNext.setIndex,
            pendingNext: null,
          };
        }
        return { ...current, restLeft: current.restLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionState.active, sessionState.isResting]);

  useEffect(() => {
    setShowRecordPanel(false);
    setSessionState(createEmptySession());
    setEditingExerciseId(null);
  }, [selectedDay, currentWeek]);

  const getDayExercises = () => selectedDayData?.exercises || [];

  const commitExercises = async (nextExercises: WorkoutExercise[]) => {
    if (!selectedDayData) return;
    await updateDayRoutine(currentWeek, selectedDay, { exercises: nextExercises });
  };

  const handleAddExercise = async () => {
    const exerciseName = `새 운동 ${getDayExercises().length + 1}`;
    await addExerciseToDayRoutine(currentWeek, selectedDay, {
      name: exerciseName,
      sets: [{ id: `s-${Date.now()}`, weight: 0, reps: 0, isWarmup: false, completed: false }],
    });
    setTimeout(() => {
      const latestExercise = getCurrentWeekPlan()?.days.find(day => day.dayOfWeek === selectedDay)?.exercises.slice(-1)[0];
      if (latestExercise) {
        setExpandedExercise(latestExercise.id);
        setEditingExerciseId(latestExercise.id);
        setEditingExerciseName(latestExercise.name);
      }
    }, 0);
  };

  const handleExerciseNameSave = async (exerciseId: string) => {
    if (!selectedDayData) return;
    const nextExercises = selectedDayData.exercises.map(exercise =>
      exercise.id === exerciseId ? { ...exercise, name: editingExerciseName.trim() || '새 운동' } : exercise,
    );
    await commitExercises(nextExercises);
    setEditingExerciseId(null);
    setEditingExerciseName('');
  };

  const handleRoutineNameSave = async () => {
    await updateDayRoutine(currentWeek, selectedDay, { routineName: routineNameDraft.trim() || undefined });
    setEditingRoutineName(false);
  };

  const handleAddSet = async (exerciseId: string) => {
    if (!selectedDayData) return;
    const nextExercises = selectedDayData.exercises.map(exercise =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: [...exercise.sets, { id: `s-${Date.now()}`, weight: 0, reps: 0, isWarmup: false, completed: false }],
          }
        : exercise,
    );
    await commitExercises(nextExercises);
  };

  const handleUpdateSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    if (!selectedDayData) return;
    const nextExercises = selectedDayData.exercises.map(exercise =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map(set => (set.id === setId ? { ...set, [field]: value } : set)),
          }
        : exercise,
    );
    await commitExercises(nextExercises);
  };

  const handleToggleSetComplete = async (exerciseId: string, setId: string) => {
    if (!selectedDayData) return;
    const nextExercises = selectedDayData.exercises.map(exercise =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map(set => (set.id === setId ? { ...set, completed: !set.completed } : set)),
          }
        : exercise,
    );
    await commitExercises(nextExercises);
  };

  const handleToggleAllSets = async (exerciseId: string) => {
    if (!selectedDayData) return;
    const exercise = selectedDayData.exercises.find(item => item.id === exerciseId);
    if (!exercise) return;
    const allCompleted = exercise.sets.every(set => set.completed);
    const nextExercises = selectedDayData.exercises.map(item =>
      item.id === exerciseId ? { ...item, sets: item.sets.map(set => ({ ...set, completed: !allCompleted })) } : item,
    );
    await commitExercises(nextExercises);
  };

  const openRecordPanel = () => {
    if (!selectedDayData || selectedDayData.exercises.length === 0) return;
    setShowRecordPanel(true);
  };

  const saveWorkoutRecord = async (exercises: WorkoutExercise[], startedAt?: string | null, finishedAt?: string | null) => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const record = {
      date: dateStr,
      weekNumber: currentWeek,
      dayOfWeek: selectedDay,
      exercises,
      startTime: startedAt || undefined,
      endTime: finishedAt || undefined,
      duration: startedAt && finishedAt ? Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000)) : 0,
      totalVolume: exercises.reduce((sum, ex) => sum + ex.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0),
    };
    await addWorkoutRecord(record);
    const syncResult = syncWorkoutRecordToPlannedEvent(record);
    if (syncResult.status === 'missing-category') {
      toast.error('캘린더 앱에 운동 카테고리가 없습니다. 설정에서 추가해주세요.');
    } else if (syncResult.status === 'missing-schedule') {
      toast.error('캘린더앱에서 운동을 먼저 등록해주세요!');
    } else if (syncResult.status === 'updated') {
      toast.success('캘린더 일정 메모에 운동 기록이 등록되었습니다.');
    }
    setShowRecordPanel(false);
    setSessionState(createEmptySession());
  };

  const startWorkoutSession = () => {
    if (!selectedDayData || selectedDayData.exercises.length === 0) return;
    setShowRecordPanel(false);
    setSessionState({
      active: true,
      exercises: cloneExercises(selectedDayData.exercises),
      exerciseIndex: 0,
      setIndex: 0,
      isResting: false,
      restLeft: 0,
      pendingNext: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });
  };

  const finishWorkoutSession = (exercises: WorkoutExercise[]) => {
    setSessionState(current => ({
      ...current,
      active: false,
      exercises,
      isResting: false,
      restLeft: 0,
      pendingNext: null,
      finishedAt: new Date().toISOString(),
    }));
    setShowRecordPanel(true);
  };

  const skipToNextSet = () => {
    setSessionState(current => {
      const next = getNextSetPosition(current.exercises, current.exerciseIndex, current.setIndex);
      if (!next) {
        setTimeout(() => finishWorkoutSession(current.exercises), 0);
        return current;
      }
      return { ...current, exerciseIndex: next.exerciseIndex, setIndex: next.setIndex, isResting: false, restLeft: 0, pendingNext: null };
    });
  };

  const completeCurrentSet = () => {
    setSessionState(current => {
      const nextExercises = cloneExercises(current.exercises);
      const exercise = nextExercises[current.exerciseIndex];
      const set = exercise?.sets[current.setIndex];
      if (!set) return current;
      set.completed = true;
      const next = getNextSetPosition(nextExercises, current.exerciseIndex, current.setIndex);
      if (!next) {
        setTimeout(() => finishWorkoutSession(nextExercises), 0);
        return { ...current, exercises: nextExercises };
      }
      return {
        ...current,
        exercises: nextExercises,
        isResting: true,
        restLeft: settings.defaultRestTime,
        pendingNext: next,
      };
    });
  };

  const addSetDuringSession = () => {
    setSessionState(current => {
      const nextExercises = cloneExercises(current.exercises);
      const exercise = nextExercises[current.exerciseIndex];
      if (!exercise) return current;
      exercise.sets.push({
        id: `session-set-${Date.now()}`,
        weight: exercise.sets[current.setIndex]?.weight || 0,
        reps: exercise.sets[current.setIndex]?.reps || 0,
        isWarmup: false,
        completed: false,
      });
      return { ...current, exercises: nextExercises };
    });
  };

  const renderOverview = () => (
    <>
      <div className="mb-4 md:mb-6">
        <motion.div
          className="mb-2 md:mb-3 inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 md:py-2"
          style={{ background: accentTheme.gradientPrimary, boxShadow: `0 4px 15px ${accentTheme.shadow}` }}
          whileHover={{ scale: 1.03 }}
        >
          <Flame className="h-3 w-3 md:h-4 md:w-4 text-white" fill="white" />
          <span className="text-xs md:text-sm font-bold text-white">{currentStreak}일 연속 출석</span>
        </motion.div>
        <h1 className="mb-1 md:mb-2 text-2xl md:text-4xl font-black tracking-tight" style={{ color: theme.text }}>
          TODAY&apos;S WORKOUT
        </h1>
        <p className="text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
          {format(new Date(), 'M월 d일 EEEE', { locale: ko })} · {settings.name || '사용자'}
        </p>
      </div>

      <div className="mb-4 md:mb-6 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
        {[
          { label: '연속 출석', value: `${currentStreak}`, unit: '일', icon: Flame, gradient: accentTheme.gradientPrimary },
          { label: '이번 달', value: `${monthlyCount}`, unit: '회', icon: Calendar, gradient: accentTheme.gradientSecondary },
          { label: '오늘 진행률', value: `${progressPercent}`, unit: '%', icon: TrendingUp, gradient: accentTheme.gradientPrimary },
        ].map(card => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              whileHover={{ y: -2 }}
              className="relative overflow-hidden rounded-2xl md:rounded-[28px] border p-4 md:p-6"
              style={{ background: card.gradient, borderColor: `${accentTheme.primary}55`, boxShadow: theme.elevatedShadow }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_42%)] opacity-80" />
              <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
              <div className="relative z-10">
                <div className="mb-2 md:mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  <span className="text-xs md:text-sm font-bold text-white/90">{card.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-5xl font-black text-white">{card.value}</span>
                  <span className="text-base md:text-xl font-bold text-white/80">{card.unit}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl md:rounded-[28px] border p-4 md:p-6" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
        <h3 className="mb-3 md:mb-4 text-xs md:text-sm font-bold" style={{ color: theme.textSecondary }}>이번 주 활동</h3>
        <div className="flex items-center justify-between gap-1 md:gap-2">
          {weekDots.map((hasWorkout, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1 md:gap-2">
              <div
                className="flex aspect-square w-full max-w-[40px] md:max-w-[60px] items-center justify-center rounded-xl md:rounded-2xl text-base md:text-xl font-black"
                style={{
                  background: i === new Date().getDay() ? accentTheme.gradientPrimary : hasWorkout ? theme.accentSurfaceStrong : theme.bg,
                  color: i === new Date().getDay() ? 'white' : theme.textMuted,
                  boxShadow: i === new Date().getDay() ? theme.buttonShadow : hasWorkout ? theme.panelShadow : 'none',
                }}
              >
                {hasWorkout ? '✓' : ''}
              </div>
              <span className="text-[10px] md:text-xs font-bold" style={{ color: theme.textMuted }}>{DAYS_OF_WEEK[i]}</span>
            </div>
          ))}
        </div>
        
        {aiComment && (
          <div className="mt-3 md:mt-4 rounded-xl md:rounded-2xl border p-3 md:p-4" style={{ background: theme.accentSurface || theme.accent }}>
            <div className="mb-1 md:mb-2 flex items-center gap-2">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" style={{ color: accentTheme.primary }} />
              <span className="text-[10px] md:text-xs font-bold" style={{ color: theme.textMuted }}>AI 추천</span>
            </div>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: theme.text }}>{aiComment}</p>
          </div>
        )}
        
        {!aiComment && !isLoadingComment && workoutRecords.length > 0 && (
          <div className="mt-3 md:mt-4 rounded-xl md:rounded-2xl border p-3 md:p-4" style={{ background: theme.accentSurface || theme.accent }}>
            <p className="text-xs md:text-sm" style={{ color: theme.textMuted }}>설정에서 API 키를 입력하면 운동 추천을 받을 수 있습니다.</p>
          </div>
        )}
      </div>
    </>
  );

  const renderDayButton = (dayIndex: number, hasExercises: boolean, labelMode: 'full' | 'short') => {
    const active = selectedDay === dayIndex;
    const label = labelMode === 'full' ? `${DAYS_OF_WEEK[dayIndex]}요일` : DAYS_OF_WEEK[dayIndex];
    
    if (labelMode === 'short') {
      return (
        <motion.button
          key={dayIndex}
          onClick={() => setSelectedDay(dayIndex)}
          whileTap={{ scale: 0.98 }}
          className="relative py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex flex-col items-center justify-center"
          animate={{
            background: active ? accentTheme.gradientPrimary : theme.navBackground || theme.accent,
          }}
          style={{
            color: active ? 'white' : theme.text,
          }}
        >
          <span>{label}</span>
          {hasExercises && !active && (
            <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ background: accentTheme.primary }} />
          )}
        </motion.button>
      );
    }
    
    return (
      <motion.button
        key={dayIndex}
        onClick={() => setSelectedDay(dayIndex)}
        layout
        whileTap={{ scale: 0.98 }}
        className="relative block w-full overflow-hidden rounded-2xl px-4 py-3 text-left font-semibold"
        animate={{
          borderColor: active ? accentTheme.primary : theme.cardBorder,
          boxShadow: active ? `0 0 0 1px ${accentTheme.primary}, 0 14px 28px ${accentTheme.shadowLight}` : '0 0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: active ? theme.navActiveBackground || accentTheme.gradientPrimary : theme.navBackground || theme.accent,
          color: active ? theme.navActiveText || 'white' : theme.text,
          borderWidth: 1,
          borderStyle: 'solid',
          boxShadow: active ? theme.buttonShadow : 'none',
        }}
      >
        <span>{label}</span>
        {hasExercises && !active && (
          <span className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: accentTheme.primary }} />
        )}
      </motion.button>
    );
  };

  const renderRecordPanel = () => {
    const recordExercises = sessionState.exercises.length > 0 ? sessionState.exercises : getDayExercises();
    if (!showRecordPanel || recordExercises.length === 0) return null;

    const totalVolume = recordExercises.reduce((sum, ex) => sum + ex.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0);

    return (
      <motion.div
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 18 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl md:rounded-[28px] border p-4 md:p-6"
        style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}
      >
        <div className="mb-2 md:mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 md:h-5 md:w-5" style={{ color: accentTheme.primary }} />
          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
            Workout Summary
          </span>
        </div>
        <h3 className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>오늘 운동 기록</h3>
        <p className="mt-1 md:mt-2 text-xs md:text-sm leading-5 md:leading-6" style={{ color: theme.textSecondary }}>
          {recordExercises.length}개 운동, 총 {recordExercises.reduce((sum, ex) => sum + ex.sets.length, 0)}세트, {totalVolume.toLocaleString()}kg 볼륨
        </p>

        <div className="mt-3 md:mt-4 space-y-2">
          {recordExercises.map(exercise => (
            <div key={exercise.id} className="rounded-xl md:rounded-2xl border px-3 md:px-4 py-2 md:py-3" style={{ background: theme.accentSurface, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
              <div className="font-semibold text-sm md:text-base" style={{ color: theme.text }}>{exercise.name}</div>
              <div className="mt-0.5 md:mt-1 text-[10px] md:text-xs" style={{ color: theme.textMuted }}>
                {exercise.sets.length}세트 · {exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0).toLocaleString()}kg
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 md:mt-5 flex gap-2 md:gap-3">
          <button
            onClick={() => {
              setShowRecordPanel(false);
              if (!sessionState.active) setSessionState(createEmptySession());
            }}
            className="flex-1 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-sm md:text-base"
            style={{ background: theme.accentSurface, color: theme.textSecondary, boxShadow: theme.panelShadow }}
          >
            취소
          </button>
          <button
            onClick={() => saveWorkoutRecord(recordExercises, sessionState.startedAt, sessionState.finishedAt || new Date().toISOString())}
            className="flex-1 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-sm md:text-base"
            style={{ background: theme.buttonGradient || theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white', boxShadow: theme.buttonShadow }}
          >
            저장
          </button>
        </div>
      </motion.div>
    );
  };

  const renderPlanView = () => (
    <div>
      {/* 주차 선택 + 요일 선택 - 모바일에서 week 아래 가로 요일 */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4 mb-3 md:mb-4">
        {[1, 2, 3, 4].map(week => {
          const active = currentWeek === week;
          return (
            <motion.button
              key={week}
              onClick={() => setCurrentWeek(week)}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg md:rounded-xl border py-2 md:py-3 text-xs md:text-sm font-black"
              animate={{
                borderColor: active ? accentTheme.primary : theme.cardBorder,
                boxShadow: active ? `0 0 0 1px ${accentTheme.primary}, 0 8px 16px ${accentTheme.shadowLight}` : theme.panelShadow,
              }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: active ? theme.navActiveBackground || accentTheme.gradientPrimary : theme.panelBackground || theme.card,
                color: active ? theme.navActiveText || 'white' : theme.textMuted,
                borderWidth: 1,
                borderStyle: 'solid',
              }}
            >
              W{week}
            </motion.button>
          );
        })}
      </div>

      {/* 모바일 가로 요일 선택 */}
      <div 
        className="rounded-xl md:rounded-2xl border p-2 md:p-3 mb-4 md:mb-4"
        style={{ background: theme.panelBackground || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}
      >
        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
          {DAYS_OF_WEEK.map((_, index) => renderDayButton(index, (currentPlan?.days.find(day => day.dayOfWeek === index)?.exercises.length || 0) > 0, 'short'))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
        {/* 데스크탑: 왼쪽 요일 목록 사이드바 */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="rounded-2xl md:rounded-[28px] border p-3 md:p-4 sticky top-24" style={{ background: theme.panelBackground || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
            <h3 className="mb-2 md:mb-3 px-1 md:px-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              Workout Day
            </h3>
            <div className="flex flex-col gap-1.5 md:gap-2">
              {DAYS_OF_WEEK.map((_, index) => renderDayButton(index, (currentPlan?.days.find(day => day.dayOfWeek === index)?.exercises.length || 0) > 0, 'full'))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 운동 루틴 */}
        <div className="lg:col-span-9">
        {selectedDayData ? (
          <div className="space-y-3 md:space-y-4">
            <div className="rounded-2xl md:rounded-[28px] border p-4 md:p-6" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
              <div className="mb-1 md:mb-2 flex items-start justify-between gap-2 md:gap-3">
                <div className="min-w-0 flex-1">
                  {editingRoutineName ? (
                    <div className="flex gap-2">
                      <input
                        value={routineNameDraft}
                        onChange={e => setRoutineNameDraft(e.target.value)}
                        className="w-full rounded-xl md:rounded-2xl border px-3 md:px-4 py-2 md:py-3 font-semibold outline-none text-sm md:text-base"
                        style={{ background: theme.navBackground || theme.accent, borderColor: theme.cardBorder, color: theme.text }}
                        autoFocus
                      />
                      <button onClick={handleRoutineNameSave} className="rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 font-semibold text-sm md:text-base" style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}>
                        저장
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="truncate text-lg md:text-3xl font-black" style={{ color: theme.text }}>{routineName}</h2>
                      <p className="mt-1 md:mt-2 text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                        {currentWeek}주차 · {selectedDayData.exercises.length}개 운동 · {totalSets}세트
                      </p>
                    </>
                  )}
                </div>
                {!editingRoutineName && (
                  <button
                    onClick={() => {
                      setRoutineNameDraft(routineName);
                      setEditingRoutineName(true);
                    }}
                    className="rounded-lg md:rounded-xl p-1.5 md:p-2"
                    style={{ background: theme.navBackground || theme.accent, color: theme.textSecondary }}
                  >
                    <Edit2 className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              {selectedDayData.exercises.map(exercise => {
                const expanded = expandedExercise === exercise.id;
                const allCompleted = exercise.sets.every(set => set.completed);
                return (
                  <motion.div
                    key={exercise.id}
                    layout
                    className="overflow-hidden rounded-2xl md:rounded-[28px] border"
                    animate={{
                      borderColor: allCompleted ? accentTheme.primary : theme.cardBorder,
                      boxShadow: allCompleted ? `0 0 0 1px ${accentTheme.primary}, 0 18px 36px ${accentTheme.shadowLight}` : theme.panelShadow,
                    }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{ background: theme.panelBackgroundStrong || theme.card }}
                  >
                    <div className="flex items-center justify-between gap-2 md:gap-3 p-3 md:p-5">
                      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                        <motion.button
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleAllSets(exercise.id);
                          }}
                          whileTap={{ scale: 0.94 }}
                          className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl text-xl md:text-2xl font-black"
                          style={{
                            background: allCompleted ? theme.navActiveBackground || accentTheme.gradientPrimary : theme.navBackground || theme.accent,
                            color: allCompleted ? theme.navActiveText || 'white' : theme.textMuted,
                          }}
                        >
                          {allCompleted ? '✓' : '○'}
                        </motion.button>
                        <div className="min-w-0 flex-1">
                          {editingExerciseId === exercise.id ? (
                            <div className="flex gap-2">
                              <input
                                value={editingExerciseName}
                                onChange={e => setEditingExerciseName(e.target.value)}
                                className="w-full rounded-xl md:rounded-2xl border px-3 md:px-4 py-2 md:py-3 font-semibold outline-none text-sm md:text-base"
                                style={{ background: theme.navBackground || theme.accent, borderColor: theme.cardBorder, color: theme.text }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleExerciseNameSave(exercise.id)}
                                className="rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 font-semibold text-sm md:text-base"
                                style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}
                              >
                                저장
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-sm md:text-lg font-black" style={{ color: theme.text }}>{exercise.name}</h3>
                                <button
                                  onClick={() => {
                                    setEditingExerciseId(exercise.id);
                                    setEditingExerciseName(exercise.name);
                                  }}
                                  className="rounded-lg p-1"
                                  style={{ background: theme.navBackground || theme.accent, color: theme.textSecondary }}
                                >
                                  <PencilLine className="h-3 w-3 md:h-4 md:w-4" />
                                </button>
                              </div>
                              <p className="text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                                {exercise.sets.filter(set => set.completed).length}/{exercise.sets.length} 세트 완료
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedExercise(expanded ? null : exercise.id)}
                        className="rounded-lg md:rounded-xl p-1.5 md:p-2"
                        style={{ background: theme.navBackground || theme.accent, color: theme.textSecondary }}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4 md:h-5 md:w-5" /> : <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="space-y-2 md:space-y-3 px-3 md:px-5 pb-3 md:pb-5"
                          style={{ background: theme.navBackground || '#F8F9FA' }}
                        >
                          <div className="mb-1 md:mb-2 flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-black" style={{ color: theme.textMuted }}>
                            <span className="w-8 md:w-12 text-center">세트</span>
                            <span className="flex-1 text-center">중량</span>
                            <span className="flex-1 text-center">횟수</span>
                            <span className="w-8 md:w-12" />
                          </div>

                          {exercise.sets.map((set, index) => (
                            <div
                              key={set.id}
                              className="flex items-center gap-1 md:gap-2 rounded-xl md:rounded-2xl border px-1.5 md:px-2 py-1.5 md:py-2 transition-all"
                              style={{
                                background: set.completed ? `${accentTheme.primary}12` : 'transparent',
                                borderColor: set.completed ? `${accentTheme.primary}60` : 'transparent',
                                boxShadow: set.completed ? `0 0 0 1px ${accentTheme.primary}1f` : 'none',
                              }}
                            >
                              <span className="w-8 md:w-12 text-center text-xs md:text-sm font-black" style={{ color: theme.textSecondary }}>
                                #{index + 1}
                              </span>
                              <input
                                type="number"
                                value={set.weight || ''}
                                onChange={e => handleUpdateSet(exercise.id, set.id, 'weight', Number(e.target.value))}
                                className="flex-1 rounded-lg md:rounded-xl border px-2 md:px-3 py-2 md:py-3 text-center font-bold outline-none text-sm"
                                style={{ background: theme.panelBackgroundStrong || '#fff', borderColor: theme.cardBorder, color: theme.text }}
                                placeholder="0"
                              />
                              <input
                                type="number"
                                value={set.reps || ''}
                                onChange={e => handleUpdateSet(exercise.id, set.id, 'reps', Number(e.target.value))}
                                className="flex-1 rounded-lg md:rounded-xl border px-2 md:px-3 py-2 md:py-3 text-center font-bold outline-none text-sm"
                                style={{ background: theme.panelBackgroundStrong || '#fff', borderColor: theme.cardBorder, color: theme.text }}
                                placeholder="0"
                              />
                              <button
                                onClick={() => handleToggleSetComplete(exercise.id, set.id)}
                                className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg md:rounded-xl text-base md:text-lg font-black"
                                style={{
                                  background: set.completed ? theme.navActiveBackground || accentTheme.gradientPrimary : theme.panelBackgroundStrong || theme.card,
                                  color: set.completed ? theme.navActiveText || 'white' : theme.textMuted,
                                }}
                              >
                                <Check className="h-4 w-4 md:h-5 md:w-5" />
                              </button>
                            </div>
                          ))}

                          <button
                            onClick={() => handleAddSet(exercise.id)}
                            className="w-full rounded-lg md:rounded-xl py-2 md:py-3 text-xs md:text-sm font-semibold"
                            style={{ background: theme.panelBackgroundStrong || '#fff', color: theme.textSecondary }}
                          >
                            + 세트 추가
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={handleAddExercise}
              className="flex w-full items-center justify-center gap-2 md:gap-3 rounded-2xl md:rounded-[28px] border-2 border-dashed py-4 md:py-5 text-sm md:text-lg font-black"
              style={{ background: theme.panelBackgroundStrong || '#fff', borderColor: theme.cardBorder, color: theme.textSecondary }}
            >
              <Plus className="h-5 w-5 md:h-6 md:w-6" />
              새 운동 추가
            </button>
          </div>
        ) : (
          <div className="rounded-2xl md:rounded-[28px] border p-6 md:p-12 text-center" style={{ background: theme.panelBackgroundStrong || '#fff', borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
            <div className="mb-3 md:mb-4 text-4xl md:text-6xl">💪</div>
            <p className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>운동을 추가하세요</p>
            <p className="mt-1 md:mt-2 text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
              아직 {DAYS_OF_WEEK[selectedDay]}요일 루틴이 없습니다
            </p>
            <button
              onClick={handleAddExercise}
              className="mt-4 md:mt-6 rounded-xl md:rounded-2xl px-4 md:px-6 py-2 md:py-3 font-bold text-sm md:text-base"
              style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}
            >
              운동 추가하기
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );

  const renderStartView = () => (
    <div className="space-y-3 md:space-y-4">
        <div className="rounded-2xl md:rounded-[28px] border p-4 md:p-6" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
          <div className="mb-1 md:mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 md:h-5 md:w-5" style={{ color: accentTheme.primary }} />
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              Start Session
            </span>
          </div>
          <h2 className="text-lg md:text-3xl font-black" style={{ color: theme.text }}>{routineName}</h2>
          <p className="mt-1 md:mt-2 text-xs md:text-sm leading-5 md:leading-6" style={{ color: theme.textSecondary }}>
            {getDayExercises().length}개 운동, {totalSets}세트 기준으로 오늘 세션을 진행합니다.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {sessionState.active ? (
            <motion.div
              key="session-live"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl md:rounded-[28px] border p-4 md:p-6"
              style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}
            >
              <div className="mb-3 md:mb-4 flex items-center justify-between gap-2 md:gap-3">
                <div>
                  <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                    Current Set
                  </div>
                  <h3 className="mt-0.5 md:mt-1 text-lg md:text-2xl font-black" style={{ color: theme.text }}>
                    {sessionExercise?.name}
                  </h3>
                </div>
                <div className="rounded-xl md:rounded-2xl px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold" style={{ background: theme.navBackground || theme.accent, color: theme.textSecondary }}>
                  {sessionState.exerciseIndex + 1}/{sessionState.exercises.length}
                </div>
              </div>

              {sessionSet && (
                <div className="rounded-2xl md:rounded-[24px] border p-4 md:p-5" style={{ background: accentTheme.gradientSoft, borderColor: `${accentTheme.primary}40` }}>
                  <div className="text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                    세트 {sessionState.setIndex + 1} / {sessionExercise?.sets.length}
                  </div>
                  <div className="mt-2 md:mt-3 flex items-end gap-4 md:gap-6">
                    <div>
                      <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>Weight</div>
                      <div className="mt-1 text-2xl md:text-4xl font-black" style={{ color: theme.text }}>{sessionSet.weight || 0}<span className="ml-1 text-sm md:text-lg">kg</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>Reps</div>
                      <div className="mt-1 text-2xl md:text-4xl font-black" style={{ color: theme.text }}>{sessionSet.reps || 0}<span className="ml-1 text-sm md:text-lg">회</span></div>
                    </div>
                  </div>
                </div>
              )}

              {sessionState.isResting ? (
                <div className="mt-4 md:mt-5 rounded-2xl md:rounded-[24px] border p-4 md:p-5 text-center" style={{ background: theme.navBackground || theme.accent, borderColor: theme.cardBorder }}>
                  <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                    Rest Timer
                  </div>
                  <div className="mt-2 md:mt-3 text-4xl md:text-6xl font-black" style={{ color: theme.text }}>
                    {Math.floor(sessionState.restLeft / 60)}:{String(sessionState.restLeft % 60).padStart(2, '0')}
                  </div>
                  <div className="mt-4 md:mt-5 flex justify-center gap-2 md:gap-3">
                    <button
                      onClick={skipToNextSet}
                      className="rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 font-semibold text-sm"
                      style={{ background: theme.panelBackgroundStrong || '#fff', color: theme.textSecondary }}
                    >
                      시간 스킵
                    </button>
                    <button
                      onClick={() => setSessionState(current => ({ ...current, restLeft: current.restLeft + 30 }))}
                      className="rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 font-semibold text-sm"
                      style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}
                    >
                      +30초
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 md:mt-5 grid gap-2 md:gap-3 md:grid-cols-3">
                  <button
                    onClick={skipToNextSet}
                    className="rounded-xl md:rounded-2xl px-3 md:px-4 py-3 md:py-4 font-semibold text-sm"
                    style={{ background: theme.navBackground || theme.accent, color: theme.textSecondary }}
                  >
                    세트 스킵
                  </button>
                  <button
                    onClick={completeCurrentSet}
                    className="rounded-xl md:rounded-2xl px-3 md:px-4 py-3 md:py-4 font-semibold text-sm"
                    style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}
                  >
                    세트 완료
                  </button>
                  <button
                    onClick={addSetDuringSession}
                    className="rounded-xl md:rounded-2xl px-3 md:px-4 py-3 md:py-4 font-semibold text-sm"
                    style={{ background: theme.panelBackgroundStrong || '#fff', color: theme.text }}
                  >
                    세트 추가
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="session-idle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="space-y-3 md:space-y-4"
            >
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                {getDayExercises().map(exercise => (
                  <div key={exercise.id} className="rounded-2xl md:rounded-[24px] border p-3 md:p-4" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}>
                    <div className="text-sm md:text-base font-bold" style={{ color: theme.text }}>{exercise.name}</div>
                    <div className="mt-0.5 md:mt-1 text-xs md:text-sm" style={{ color: theme.textMuted }}>
                      {exercise.sets.length}세트
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                <button
                  onClick={openRecordPanel}
                  className="rounded-2xl md:rounded-[24px] border px-3 md:px-4 py-3 md:py-4 font-semibold text-sm"
                  style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, color: theme.textSecondary }}
                >
                  기록하기
                </button>
                <button
                  onClick={startWorkoutSession}
                  className="rounded-2xl md:rounded-[24px] px-3 md:px-4 py-3 md:py-4 font-black text-sm"
                  style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}
                >
                  운동 시작
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-full pb-24" style={{ backgroundColor: theme.bg }}>
      <div className="mx-auto max-w-[1320px] px-4 pb-6 pt-3">
        {view === 'overview' && renderOverview()}

        {view === 'workout' && (
          <>
            {showRecordPanel || sessionState.active ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={showRecordPanel ? 'record-focus' : 'session-focus'}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-4 md:mb-5">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 md:py-2" style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}>
                      {showRecordPanel ? <Calendar className="h-3 w-3 md:h-4 md:w-4" /> : <TimerReset className="h-3 w-3 md:h-4 md:w-4" />}
                      <span className="text-xs md:text-sm font-bold">{showRecordPanel ? 'WORKOUT RECORD' : 'WORKOUT SESSION'}</span>
                    </div>
                    <h1 className="mt-3 md:mt-4 text-2xl md:text-4xl font-black tracking-tight" style={{ color: theme.text }}>
                      {showRecordPanel ? 'SESSION SUMMARY' : 'FOCUS MODE'}
                    </h1>
                    <p className="mt-1 md:mt-2 text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
                      탭과 배너를 제외한 메인 영역 전체를 운동 화면으로 전환했습니다.
                    </p>
                  </div>

                  {showRecordPanel ? renderRecordPanel() : renderStartView()}
                </motion.div>
              </AnimatePresence>
            ) : (
              <>
            <div className="mb-4 md:mb-5">
              <div className="inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 md:py-2" style={{ background: theme.navActiveBackground || accentTheme.gradientPrimary, color: theme.navActiveText || 'white' }}>
                <Flame className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm font-bold">WORKOUT FLOW</span>
              </div>
              <h1 className="mt-3 md:mt-4 text-2xl md:text-4xl font-black tracking-tight" style={{ color: theme.text }}>
                PLAN & START
              </h1>
              <p className="mt-1 md:mt-2 text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
                주차 계획과 실제 세션 진행을 분리해서 관리합니다.
              </p>
            </div>

            <div className="mb-4 md:mb-6 flex rounded-2xl md:rounded-[24px] border p-1" style={{ background: theme.navBackground || theme.accent, borderColor: theme.cardBorder }}>
              {[
                { id: 'plan' as const, label: '계획' },
                { id: 'start' as const, label: '시작' },
              ].map(tab => {
                const active = workoutMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setWorkoutMode(tab.id)}
                    className="flex-1 rounded-[18px] md:rounded-[20px] px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold transition-all"
                    style={{
                      background: active ? theme.navActiveBackground || accentTheme.gradientPrimary : 'transparent',
                      color: active ? theme.navActiveText || 'white' : theme.textMuted,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={workoutMode}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {workoutMode === 'plan' ? renderPlanView() : renderStartView()}
              </motion.div>
            </AnimatePresence>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
