import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../../../context/HealthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Timer,
  Dumbbell,
  Trophy,
  X,
  CheckCircle2,
  Pencil,
  Trash2,
  BedDouble,
  ClipboardList,
  SkipForward,
  GripVertical,
} from 'lucide-react';
import { WorkoutExercise, WorkoutSet } from '../../../types/health';
import { toast } from '../../../lib/toast';
import { syncWorkoutRecordToPlannedEvent } from '../../../lib/plannerWorkoutSync';

interface WorkoutTabProps {
  theme: any;
  onNavigateToRecords?: () => void;
}

interface ActiveSession {
  weekNumber: number;
  dayOfWeek: number;
  exercises: WorkoutExercise[];
  startTime: string;
  completedSets: Set<string>; // "exerciseIdx-setIdx"
  mode: 'tracking' | 'direct';
  currentExerciseIdx: number;
  currentSetIdx: number;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일 표시 순서

export function WorkoutTab({ theme, onNavigateToRecords }: WorkoutTabProps) {
  const {
    weekPlans,
    currentWeek,
    settings,
    addWorkoutRecord,
    workoutRecords,
    updateDayRoutine,
    addExerciseToDayRoutine,
    removeExerciseFromDayRoutine,
    updateExerciseInDayRoutine,
  } = useHealth();

  // ——— Session & Timer State ———
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [confirmedElapsedSeconds, setConfirmedElapsedSeconds] = useState(0);

  // ——— Plan View State ———
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [planExercises, setPlanExercises] = useState<WorkoutExercise[]>([]);
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [checkedSets, setCheckedSets] = useState<Set<string>>(new Set()); // "exId-setIdx"
  const [expandedPlanExercises, setExpandedPlanExercises] = useState<Set<number>>(new Set());

  // ——— Inline Edit State (per exercise, replaces isEditMode) ———
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  // ——— Drag-to-reorder sets state ———
  const [dragFromSetIdx, setDragFromSetIdx] = useState<number | null>(null);
  const [dragOverSetIdx, setDragOverSetIdx] = useState<number | null>(null);

  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDayOfWeek = today.getDay();
  const alreadyWorkoutedToday = workoutRecords.some(r => r.date === todayStr);

  const currentWeekPlan = weekPlans.find(p => p.weekNumber === selectedWeek);

  // ——— selectedDay/selectedWeek 변경 시 planExercises 동기화 ———
  useEffect(() => {
    const day = currentWeekPlan?.days.find(d => d.dayOfWeek === selectedDay);
    if (day && !day.isRestDay && day.exercises.length > 0) {
      const exercises = day.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s })),
      }));
      setPlanExercises(exercises);
      const exIds = new Set(exercises.map(e => e.id));
      const setKeys = new Set<string>();
      exercises.forEach(ex => ex.sets.forEach((_, sIdx) => setKeys.add(`${ex.id}-${sIdx}`)));
      setCheckedExercises(exIds);
      setCheckedSets(setKeys);
    } else {
      setPlanExercises([]);
      setCheckedExercises(new Set());
      setCheckedSets(new Set());
    }
    setExpandedPlanExercises(new Set());
    setEditingExerciseId(null);
    setEditingExercise(null);
  }, [selectedDay, selectedWeek, currentWeekPlan]);

  // ——— 운동 타이머 (완료 확인창 뜨면 정지) ———
  useEffect(() => {
    if (session && !showFinishConfirm) {
      workoutTimerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (!session) setElapsedSeconds(0);
    }
    return () => { if (workoutTimerRef.current) clearInterval(workoutTimerRef.current); };
  }, [session, showFinishConfirm]);

  // ——— 다음 세트로 이동 ———
  const advanceToNextSet = useCallback(() => {
    setSession(s => {
      if (!s || s.mode !== 'tracking') return s;
      const ex = s.exercises[s.currentExerciseIdx];
      if (!ex) return s;
      if (s.currentSetIdx < ex.sets.length - 1) {
        return { ...s, currentSetIdx: s.currentSetIdx + 1 };
      } else if (s.currentExerciseIdx < s.exercises.length - 1) {
        return { ...s, currentExerciseIdx: s.currentExerciseIdx + 1, currentSetIdx: 0 };
      }
      return s;
    });
  }, []);

  // ——— 휴식 타이머 ———
  useEffect(() => {
    if (isResting && restTimer > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t <= 1) {
            clearInterval(restTimerRef.current!);
            setIsResting(false);
            advanceToNextSet();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [isResting, advanceToNextSet]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ——— 세트 완료 (Nike Run 모드) ———
  const completeCurrentSet = useCallback(() => {
    setSession(s => {
      if (!s || s.mode !== 'tracking') return s;
      const key = `${s.currentExerciseIdx}-${s.currentSetIdx}`;
      const newCompleted = new Set(s.completedSets);
      newCompleted.add(key);
      const currentEx = s.exercises[s.currentExerciseIdx];
      const currentSet = currentEx?.sets[s.currentSetIdx];
      const isLastSetInEx = s.currentSetIdx === (currentEx?.sets.length ?? 0) - 1;
      const isLastEx = s.currentExerciseIdx === s.exercises.length - 1;
      const isAbsolutelyLast = isLastSetInEx && isLastEx;

      if (isAbsolutelyLast) {
        setTimeout(() => {
          setConfirmedElapsedSeconds(elapsedSeconds);
          setShowFinishConfirm(true);
        }, 400);
      } else if (currentSet && !currentSet.isWarmup) {
        setTimeout(() => {
          setRestTimer(settings.defaultRestTime || 90);
          setIsResting(true);
        }, 0);
      } else {
        setTimeout(() => advanceToNextSet(), 300);
      }
      return { ...s, completedSets: newCompleted };
    });
  }, [settings.defaultRestTime, advanceToNextSet, elapsedSeconds]);

  const skipRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    setRestTimer(0);
    advanceToNextSet();
  }, [advanceToNextSet]);

  // ——— 세션 무게/횟수 수정 ———
  const updateWeight = useCallback((exerciseIdx: number, setIdx: number, delta: number) => {
    setSession(s => {
      if (!s) return null;
      return {
        ...s,
        exercises: s.exercises.map((ex, ei) =>
          ei === exerciseIdx
            ? { ...ex, sets: ex.sets.map((set, si) => si === setIdx ? { ...set, weight: Math.max(0, (set.weight || 0) + delta) } : set) }
            : ex
        ),
      };
    });
  }, []);

  const updateReps = useCallback((exerciseIdx: number, setIdx: number, delta: number) => {
    setSession(s => {
      if (!s) return null;
      return {
        ...s,
        exercises: s.exercises.map((ex, ei) =>
          ei === exerciseIdx
            ? { ...ex, sets: ex.sets.map((set, si) => si === setIdx ? { ...set, reps: Math.max(1, (set.reps || 0) + delta) } : set) }
            : ex
        ),
      };
    });
  }, []);

  // ——— 플랜 뷰에서 무게/횟수 수정 (세션 시작 전) ———
  const updatePlanWeight = (exId: string, setIdx: number, delta: number) => {
    setPlanExercises(prev => prev.map(ex =>
      ex.id === exId
        ? { ...ex, sets: ex.sets.map((s, i) => i === setIdx ? { ...s, weight: Math.max(0, (s.weight || 0) + delta) } : s) }
        : ex
    ));
  };

  const updatePlanReps = (exId: string, setIdx: number, delta: number) => {
    setPlanExercises(prev => prev.map(ex =>
      ex.id === exId
        ? { ...ex, sets: ex.sets.map((s, i) => i === setIdx ? { ...s, reps: Math.max(1, (s.reps || 0) + delta) } : s) }
        : ex
    ));
  };

  // ——— 체크박스 로직 ———
  const toggleExerciseCheck = (ex: WorkoutExercise) => {
    const allSetKeys = ex.sets.map((_, sIdx) => `${ex.id}-${sIdx}`);
    const allChecked = allSetKeys.every(k => checkedSets.has(k));
    const newChecked = new Set(checkedSets);
    const newExChecked = new Set(checkedExercises);
    if (allChecked) {
      allSetKeys.forEach(k => newChecked.delete(k));
      newExChecked.delete(ex.id);
    } else {
      allSetKeys.forEach(k => newChecked.add(k));
      newExChecked.add(ex.id);
    }
    setCheckedSets(newChecked);
    setCheckedExercises(newExChecked);
  };

  const toggleSetCheck = (exId: string, setIdx: number, ex: WorkoutExercise) => {
    const key = `${exId}-${setIdx}`;
    const newChecked = new Set(checkedSets);
    if (newChecked.has(key)) newChecked.delete(key); else newChecked.add(key);
    setCheckedSets(newChecked);
    const allSetKeys = ex.sets.map((_, sIdx) => `${exId}-${sIdx}`);
    const allChecked = allSetKeys.every(k => newChecked.has(k));
    const newExChecked = new Set(checkedExercises);
    if (allChecked) newExChecked.add(exId); else newExChecked.delete(exId);
    setCheckedExercises(newExChecked);
  };

  // ——— 선택된 운동 빌드 ———
  const buildSelectedExercises = useCallback((): WorkoutExercise[] => {
    return planExercises
      .filter(ex => ex.sets.some((_, sIdx) => checkedSets.has(`${ex.id}-${sIdx}`)))
      .map(ex => ({
        ...ex,
        sets: ex.sets.filter((_, sIdx) => checkedSets.has(`${ex.id}-${sIdx}`)),
      }));
  }, [planExercises, checkedSets]);

  // ——— 운동 시작 (Nike Run 트래킹) ———
  const startTrackingSession = () => {
    const exercises = buildSelectedExercises();
    if (exercises.length === 0) {
      toast.error('운동을 선택해주세요');
      return;
    }
    setSession({
      weekNumber: selectedWeek,
      dayOfWeek: selectedDay,
      exercises,
      startTime: new Date().toISOString(),
      completedSets: new Set(),
      mode: 'tracking',
      currentExerciseIdx: 0,
      currentSetIdx: 0,
    });
    setElapsedSeconds(0);
    toast.success('운동을 시작합니다! 파이팅!');
  };

  // ——— 기록하기 (직접 기록 모드) ———
  const startDirectRecord = () => {
    const exercises = buildSelectedExercises();
    if (exercises.length === 0) {
      toast.error('운동을 선택해주세요');
      return;
    }
    const completedSets = new Set<string>(
      exercises.flatMap((_, eIdx) => exercises[eIdx].sets.map((_, sIdx) => `${eIdx}-${sIdx}`))
    );
    setSession({
      weekNumber: selectedWeek,
      dayOfWeek: selectedDay,
      exercises,
      startTime: new Date().toISOString(),
      completedSets,
      mode: 'direct',
      currentExerciseIdx: 0,
      currentSetIdx: 0,
    });
  };

  // ——— 운동 완료 저장 ———
  const finishWorkout = async () => {
    if (!session) return;
    const endTime = new Date().toISOString();
    const totalVolume = session.exercises.reduce((sum, ex, eIdx) =>
      sum + ex.sets.reduce((sSum, set, sIdx) => {
        if (!set.isWarmup && session.completedSets.has(`${eIdx}-${sIdx}`)) {
          return sSum + (set.weight || 0) * (set.reps || 0);
        }
        return sSum;
      }, 0), 0);

    const record = {
      id: crypto.randomUUID(),
      date: todayStr,
      weekNumber: session.weekNumber,
      dayOfWeek: session.dayOfWeek,
      exercises: session.exercises,
      startTime: session.startTime,
      endTime,
      totalVolume,
      userId: 'local',
      createdAt: new Date().toISOString(),
    };

    try {
      await addWorkoutRecord({
        date: record.date,
        weekNumber: record.weekNumber,
        dayOfWeek: record.dayOfWeek,
        exercises: record.exercises,
        startTime: record.startTime,
        endTime: record.endTime,
        totalVolume: record.totalVolume,
      });

      const syncResult = syncWorkoutRecordToPlannedEvent(record);
      if (syncResult.status === 'missing-schedule') {
        toast.info('운동이 기록되었습니다. 캘린더앱에서 운동 일정을 등록하면 기록탭에서 캘린더에 연결할 수 있어요.');
      } else {
        toast.success(`운동 완료! 총 볼륨: ${totalVolume.toLocaleString()}kg`);
      }
    } catch {
      toast.error('기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }

    setSession(null);
    setIsResting(false);
    setRestTimer(0);
    setShowFinishConfirm(false);
    onNavigateToRecords?.();
  };

  const completedSetsCount = session?.completedSets.size || 0;
  const totalSetsCount = session?.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => !s.isWarmup).length, 0) || 0;

  // ——— Inline Edit Helpers ———
  const openExerciseEdit = (exercise: WorkoutExercise) => {
    if (editingExerciseId === exercise.id) {
      setEditingExerciseId(null);
      setEditingExercise(null);
    } else {
      setEditingExerciseId(exercise.id);
      setEditingExercise({ ...exercise, sets: exercise.sets.map(s => ({ ...s })) });
    }
  };

  const handleSaveExercise = async () => {
    if (!editingExercise) return;
    const day = currentWeekPlan?.days.find(d => d.dayOfWeek === selectedDay);
    if (!day) return;
    await updateExerciseInDayRoutine(selectedWeek, selectedDay, editingExercise);
    setEditingExerciseId(null);
    setEditingExercise(null);
    toast.success('저장됨');
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    await removeExerciseFromDayRoutine(selectedWeek, selectedDay, exerciseId);
    if (editingExercise?.id === exerciseId) {
      setEditingExerciseId(null);
      setEditingExercise(null);
    }
    toast.success('운동 삭제됨');
  };

  const updateEditSet = (setIdx: number, field: 'weight' | 'reps', delta: number) => {
    if (!editingExercise) return;
    setEditingExercise({
      ...editingExercise,
      sets: editingExercise.sets.map((s, i) =>
        i === setIdx ? { ...s, [field]: Math.max(field === 'reps' ? 1 : 0, (s[field] || 0) + delta) } : s
      ),
    });
  };

  const addSetToEditExercise = (isWarmup: boolean) => {
    if (!editingExercise) return;
    setEditingExercise({
      ...editingExercise,
      sets: [...editingExercise.sets, { id: crypto.randomUUID(), weight: 0, reps: 10, isWarmup, completed: false }],
    });
  };

  const removeSetFromEditExercise = (setIdx: number) => {
    if (!editingExercise) return;
    setEditingExercise({ ...editingExercise, sets: editingExercise.sets.filter((_, i) => i !== setIdx) });
  };

  const handleToggleRestDay = async () => {
    const day = currentWeekPlan?.days.find(d => d.dayOfWeek === selectedDay);
    if (!day) return;
    await updateDayRoutine(selectedWeek, selectedDay, { isRestDay: !day.isRestDay });
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) return;
    await addExerciseToDayRoutine(selectedWeek, selectedDay, {
      name: newExerciseName.trim(),
      sets: [
        { id: crypto.randomUUID(), weight: 0, reps: 10, isWarmup: false, completed: false },
        { id: crypto.randomUUID(), weight: 0, reps: 10, isWarmup: false, completed: false },
        { id: crypto.randomUUID(), weight: 0, reps: 10, isWarmup: false, completed: false },
      ],
    });
    setNewExerciseName('');
    setShowAddExercise(false);
    toast.success('운동 추가됨');
  };

  // ——— Drag-to-reorder sets ———
  const handleSetDragStart = (idx: number) => {
    setDragFromSetIdx(idx);
  };

  const handleSetDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverSetIdx(idx);
  };

  const handleSetDrop = () => {
    if (dragFromSetIdx === null || dragOverSetIdx === null || !editingExercise) return;
    if (dragFromSetIdx === dragOverSetIdx) {
      setDragFromSetIdx(null);
      setDragOverSetIdx(null);
      return;
    }
    const newSets = [...editingExercise.sets];
    const [moved] = newSets.splice(dragFromSetIdx, 1);
    newSets.splice(dragOverSetIdx, 0, moved);
    setEditingExercise({ ...editingExercise, sets: newSets });
    setDragFromSetIdx(null);
    setDragOverSetIdx(null);
  };

  // ════════════════════════════════════════════════════════════
  // ——— Nike Run 트래킹 화면 ———
  // ════════════════════════════════════════════════════════════
  if (session?.mode === 'tracking') {
    const currentEx = session.exercises[session.currentExerciseIdx];
    const currentSet = currentEx?.sets[session.currentSetIdx];
    const warmupCount = currentEx?.sets.filter((s, i) => s.isWarmup && i < session.currentSetIdx).length || 0;
    const setDisplayNum = currentSet?.isWarmup ? 'W' : (session.currentSetIdx - warmupCount + 1).toString();
    const totalMainSets = currentEx?.sets.filter(s => !s.isWarmup).length || 0;
    const nextEx = session.exercises[session.currentExerciseIdx + 1];
    const isLastSetInEx = session.currentSetIdx === (currentEx?.sets.length ?? 0) - 1;
    const isLastEx = session.currentExerciseIdx === session.exercises.length - 1;
    const isAbsolutelyLast = isLastSetInEx && isLastEx;

    return (
      <div className="mx-auto max-w-[600px] p-3 md:p-5 space-y-4 min-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setConfirmedElapsedSeconds(elapsedSeconds);
              setShowFinishConfirm(true);
            }}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold border"
            style={{ borderColor: theme.line, color: theme.textMuted }}
          >
            <X className="h-4 w-4" /> 종료
          </button>
          <div className="text-center">
            <div className="text-2xl font-black tabular-nums" style={{ color: theme.primary }}>
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-[10px] font-medium" style={{ color: theme.textMuted }}>
              {completedSetsCount}/{totalSetsCount} 세트 완료
            </div>
          </div>
          <div className="w-20" />
        </div>

        {/* 진행 바 */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.line }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary || theme.primary})` }}
            animate={{ width: totalSetsCount > 0 ? `${(completedSetsCount / totalSetsCount) * 100}%` : '0%' }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* 운동 종목 진행 표시 */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {session.exercises.map((ex, eIdx) => {
            const exCompletedSets = ex.sets.filter((_, sIdx) => session.completedSets.has(`${eIdx}-${sIdx}`)).length;
            const isDone = exCompletedSets === ex.sets.length && ex.sets.length > 0;
            const isCurrent = eIdx === session.currentExerciseIdx;
            return (
              <div key={ex.id} className="flex items-center gap-1">
                <motion.div
                  animate={{
                    background: isDone ? theme.primary : isCurrent ? `${theme.primary}30` : theme.line,
                    scale: isCurrent ? 1.15 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-2.5 w-2.5 rounded-full"
                />
                {eIdx < session.exercises.length - 1 && (
                  <div className="h-px w-4" style={{ background: theme.line }} />
                )}
              </div>
            );
          })}
        </div>

        {/* 현재 운동 카드 */}
        <AnimatePresence mode="wait">
          {isResting ? (
            // ——— 휴식 타이머 ———
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center rounded-3xl border p-8 space-y-6"
              style={{ background: `${theme.primary}10`, borderColor: `${theme.primary}30` }}
            >
              <Timer className="h-10 w-10" style={{ color: theme.primary }} />
              <div>
                <p className="text-center text-sm font-semibold mb-1" style={{ color: theme.primary }}>휴식 중</p>
                <div className="text-6xl font-black tabular-nums text-center" style={{ color: theme.text }}>
                  {formatTime(restTimer)}
                </div>
              </div>
              {nextEx && (
                <p className="text-sm text-center" style={{ color: theme.textMuted }}>
                  다음: {nextEx.name}
                </p>
              )}
              <button
                onClick={skipRest}
                className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold border"
                style={{ borderColor: theme.line, color: theme.textSecondary }}
              >
                <SkipForward className="h-4 w-4" /> 건너뛰기
              </button>
            </motion.div>
          ) : (
            // ——— 현재 세트 ———
            <motion.div
              key={`${session.currentExerciseIdx}-${session.currentSetIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 rounded-3xl border p-6 space-y-6"
              style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
            >
              {/* 운동명 + 세트 정보 */}
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-3"
                  style={{ background: `${theme.primary}15`, color: theme.primary }}
                >
                  {currentSet?.isWarmup ? '워밍업' : `세트 ${setDisplayNum} / ${totalMainSets}`}
                </div>
                <h2 className="text-2xl font-black" style={{ color: theme.text }}>{currentEx?.name}</h2>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  {session.currentExerciseIdx + 1} / {session.exercises.length} 종목
                </p>
              </div>

              {/* 무게 조절 */}
              <div className="space-y-4">
                <div>
                  <p className="text-center text-xs font-semibold mb-3" style={{ color: theme.textMuted }}>무게 (kg)</p>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => updateWeight(session.currentExerciseIdx, session.currentSetIdx, -2.5)}
                      className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold"
                      style={{ background: theme.navBackground, color: theme.textSecondary }}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="text-4xl font-black w-24 text-center tabular-nums" style={{ color: theme.text }}>
                      {currentSet?.weight || 0}
                    </span>
                    <button
                      onClick={() => updateWeight(session.currentExerciseIdx, session.currentSetIdx, 2.5)}
                      className="h-12 w-12 rounded-2xl flex items-center justify-center"
                      style={{ background: theme.navBackground, color: theme.textSecondary }}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* 횟수 조절 */}
                <div>
                  <p className="text-center text-xs font-semibold mb-3" style={{ color: theme.textMuted }}>횟수</p>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => updateReps(session.currentExerciseIdx, session.currentSetIdx, -1)}
                      className="h-12 w-12 rounded-2xl flex items-center justify-center"
                      style={{ background: theme.navBackground, color: theme.textSecondary }}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="text-4xl font-black w-24 text-center tabular-nums" style={{ color: theme.text }}>
                      {currentSet?.reps || 0}
                    </span>
                    <button
                      onClick={() => updateReps(session.currentExerciseIdx, session.currentSetIdx, 1)}
                      className="h-12 w-12 rounded-2xl flex items-center justify-center"
                      style={{ background: theme.navBackground, color: theme.textSecondary }}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 세트 완료 버튼 / 운동 종료 버튼 */}
              {isAbsolutelyLast ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={completeCurrentSet}
                  className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-3"
                  style={{
                    background: `linear-gradient(135deg, #ef4444, #dc2626)`,
                    boxShadow: `0 8px 32px #ef444450`,
                  }}
                >
                  <Trophy className="h-6 w-6" />
                  운동 종료
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={completeCurrentSet}
                  className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-3"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                    boxShadow: `0 8px 32px ${theme.primary}50`,
                  }}
                >
                  <Check className="h-6 w-6" />
                  세트 완료
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 완료 확인 모달 */}
        <AnimatePresence>
          {showFinishConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={e => { if (e.target === e.currentTarget) setShowFinishConfirm(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm rounded-3xl border p-6 text-center"
                style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
              >
                <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: theme.primary }} />
                <h3 className="text-xl font-black mb-2" style={{ color: theme.text }}>운동 종료</h3>
                <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>운동 시간: {formatTime(confirmedElapsedSeconds)}</p>
                <p className="text-sm mb-4" style={{ color: theme.textSecondary }}>완료 세트: {completedSetsCount}/{totalSetsCount}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowFinishConfirm(false)} className="flex-1 rounded-2xl py-3 text-sm font-bold border" style={{ borderColor: theme.line, color: theme.textMuted }}>
                    계속
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={finishWorkout}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`, boxShadow: `0 8px 24px ${theme.primary}30` }}
                  >
                    기록 저장
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ——— 직접 기록 화면 ———
  // ════════════════════════════════════════════════════════════
  if (session?.mode === 'direct') {
    return (
      <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Direct Record</p>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>운동 기록</h1>
          </div>
          <button
            onClick={() => { setSession(null); }}
            className="rounded-2xl px-3 py-2 text-sm font-bold border"
            style={{ borderColor: theme.line, color: theme.textMuted }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="rounded-2xl border px-4 py-3 flex items-center gap-3"
          style={{ background: `${theme.primary}08`, borderColor: `${theme.primary}20` }}
        >
          <ClipboardList className="h-4 w-4 shrink-0" style={{ color: theme.primary }} />
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            오늘 완료한 운동을 확인하고 무게/횟수를 수정한 후 저장하세요.
          </p>
        </div>

        {/* 운동 목록 */}
        <div className="space-y-3">
          {session.exercises.map((exercise, exIdx) => (
            <div key={exercise.id} className="rounded-2xl border overflow-hidden" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
              <div className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0" style={{ background: `${theme.primary}15`, color: theme.primary }}>
                  {exIdx + 1}
                </div>
                <p className="flex-1 text-sm font-bold" style={{ color: theme.text }}>{exercise.name}</p>
                <CheckCircle2 className="h-5 w-5" style={{ color: theme.primary }} />
              </div>

              <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${theme.line}` }}>
                <div className="grid grid-cols-4 gap-2 pt-3 pb-1">
                  {['세트', '무게(kg)', '횟수', ''].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-center" style={{ color: theme.textMuted }}>{h}</span>
                  ))}
                </div>
                {exercise.sets.map((set, sIdx) => (
                  <div key={set.id} className="grid grid-cols-4 gap-2 items-center rounded-xl px-2 py-2" style={{ background: `${theme.primary}08` }}>
                    <div className="text-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: set.isWarmup ? `${theme.textMuted}15` : `${theme.primary}15`, color: set.isWarmup ? theme.textMuted : theme.primary }}>
                        {set.isWarmup ? 'W' : sIdx - exercise.sets.filter((s, i) => s.isWarmup && i < sIdx).length + 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => updateWeight(exIdx, sIdx, -2.5)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>{set.weight}</span>
                      <button onClick={() => updateWeight(exIdx, sIdx, 2.5)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => updateReps(exIdx, sIdx, -1)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>{set.reps}</span>
                      <button onClick={() => updateReps(exIdx, sIdx, 1)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <Check className="h-4 w-4" style={{ color: theme.primary }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={async () => { await finishWorkout(); }}
          className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`, boxShadow: `0 8px 24px ${theme.primary}40` }}
        >
          <Trophy className="h-5 w-5" />
          기록 저장
        </motion.button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ——— 플랜 뷰 (기본 화면) ———
  // ════════════════════════════════════════════════════════════
  const selectedDayPlan = currentWeekPlan?.days.find(d => d.dayOfWeek === selectedDay);
  const isRestDay = selectedDayPlan?.isRestDay ?? false;
  const anyChecked = planExercises.some(ex => ex.sets.some((_, sIdx) => checkedSets.has(`${ex.id}-${sIdx}`)));

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Training</p>
          <h1 className="text-2xl font-black" style={{ color: theme.text }}>운동 탭</h1>
        </div>
      </div>

      {/* 주차 선택 */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(w => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className="flex-1 rounded-2xl py-2.5 text-sm font-bold border transition-all"
            style={{
              background: selectedWeek === w ? theme.primary : theme.panelBackground,
              borderColor: selectedWeek === w ? theme.primary : theme.line,
              color: selectedWeek === w ? '#fff' : theme.textSecondary,
            }}
          >
            {w}주차
          </button>
        ))}
      </div>

      {/* 요일 선택 바 (월~일 순서) */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_ORDER.map(dow => {
          const dayPlan = currentWeekPlan?.days.find(d => d.dayOfWeek === dow);
          const isRest = dayPlan?.isRestDay ?? false;
          const exCount = dayPlan?.exercises.length ?? 0;
          const isSelected = selectedDay === dow;
          const isTodayDow = dow === todayDayOfWeek;
          return (
            <motion.button
              key={dow}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedDay(dow)}
              className="rounded-2xl p-2.5 text-center border transition-all"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`
                  : theme.panelBackground,
                borderColor: isSelected ? theme.primary : isTodayDow ? `${theme.primary}60` : theme.line,
              }}
            >
              <div className="text-xs font-black mb-0.5" style={{ color: isSelected ? '#fff' : isTodayDow ? theme.primary : theme.text }}>
                {DAY_LABELS[dow]}
              </div>
              <div className="text-[9px]" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : isRest ? theme.textMuted : exCount > 0 ? theme.primary : theme.textMuted }}>
                {isRest ? '휴식' : exCount > 0 ? `${exCount}종` : '없음'}
              </div>
              {isTodayDow && !isSelected && (
                <div className="h-1 w-1 rounded-full mx-auto mt-0.5" style={{ background: theme.primary }} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 루틴 이름 + 휴식일 토글 */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          key={`routine-${selectedWeek}-${selectedDay}`}
          defaultValue={selectedDayPlan?.routineName || ''}
          onBlur={e => updateDayRoutine(selectedWeek, selectedDay, { routineName: e.target.value })}
          placeholder={`${DAY_LABELS[selectedDay]}요일 루틴 이름 (선택)`}
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
        />
        <button
          onClick={handleToggleRestDay}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all shrink-0"
          style={{
            background: isRestDay ? `${theme.primary}15` : 'transparent',
            borderColor: isRestDay ? theme.primary : theme.line,
            color: isRestDay ? theme.primary : theme.textMuted,
          }}
        >
          <BedDouble className="h-3.5 w-3.5" />
          {isRestDay ? '휴식 해제' : '휴식일'}
        </button>
      </div>

      {/* 오늘 운동 완료 배너 */}
      {alreadyWorkoutedToday && selectedDay === todayDayOfWeek && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-3 flex items-center gap-3"
          style={{ background: `${theme.primary}10`, borderColor: `${theme.primary}30` }}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: theme.primary }} />
          <div>
            <p className="text-sm font-bold" style={{ color: theme.text }}>오늘 운동 완료!</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>이미 오늘의 운동을 기록했어요</p>
          </div>
        </motion.div>
      )}

      {/* 휴식일 표시 */}
      {isRestDay ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <BedDouble className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: theme.textMuted }} />
          <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
            {DAY_LABELS[selectedDay]}요일은 휴식일이에요
          </p>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            다른 요일을 선택하거나 위의 버튼으로 변경하세요
          </p>
        </div>
      ) : (
        <>
          {/* 운동 카드 목록 */}
          <div className="space-y-3">
            {planExercises.length === 0 && !showAddExercise && (
              <div
                className="rounded-2xl border p-10 text-center"
                style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
              >
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: theme.textMuted }} />
                <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>루틴이 없어요</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>아래 버튼으로 운동을 추가하세요</p>
              </div>
            )}

            {planExercises.map((exercise, exIdx) => {
              const isExpanded = expandedPlanExercises.has(exIdx);
              const isEditOpen = editingExerciseId === exercise.id;
              const allSetKeys = exercise.sets.map((_, sIdx) => `${exercise.id}-${sIdx}`);
              const checkedCount = allSetKeys.filter(k => checkedSets.has(k)).length;
              const allChecked = checkedCount === exercise.sets.length && exercise.sets.length > 0;
              const someChecked = checkedCount > 0 && !allChecked;

              return (
                <motion.div
                  key={exercise.id}
                  layout
                  className="rounded-2xl border overflow-hidden"
                  animate={{
                    borderColor: allChecked && exercise.sets.length > 0
                      ? theme.primary
                      : isEditOpen ? `${theme.primary}60` : theme.panelBorder,
                    boxShadow: allChecked && exercise.sets.length > 0
                      ? `0 0 0 1px ${theme.primary}40`
                      : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ background: theme.panelBackground }}
                >
                  {/* 운동 헤더 */}
                  <div className="flex items-center gap-2 p-3.5">
                    {/* 종목 체크박스 */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleExerciseCheck(exercise)}
                      className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all"
                      style={{
                        background: allChecked ? theme.primary : someChecked ? `${theme.primary}30` : 'transparent',
                        borderColor: allChecked ? theme.primary : someChecked ? theme.primary : theme.line,
                      }}
                    >
                      {allChecked && <Check className="h-4 w-4 text-white" />}
                      {someChecked && <div className="h-2 w-2 rounded-sm" style={{ background: theme.primary }} />}
                    </motion.button>

                    <div
                      className="h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: `${theme.primary}15`, color: theme.primary }}
                    >
                      {exIdx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{exercise.name}</p>
                      <p className="text-[11px]" style={{ color: theme.textMuted }}>
                        {checkedCount}/{exercise.sets.length} 세트 선택
                        {exercise.sets.some(s => s.isWarmup) && ' · 워밍업 포함'}
                      </p>
                    </div>

                    {/* 편집 아이콘 */}
                    <button
                      onClick={() => {
                        openExerciseEdit(exercise);
                        if (!isExpanded) {
                          const next = new Set(expandedPlanExercises);
                          next.add(exIdx);
                          setExpandedPlanExercises(next);
                        }
                      }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: isEditOpen ? `${theme.primary}20` : theme.navBackground,
                        color: isEditOpen ? theme.primary : theme.textMuted,
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* 삭제 아이콘 */}
                    <button
                      onClick={() => handleRemoveExercise(exercise.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ background: `#ef444420`, color: '#ef4444' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    {/* 드롭다운 토글 */}
                    <button
                      onClick={() => {
                        const next = new Set(expandedPlanExercises);
                        if (next.has(exIdx)) next.delete(exIdx); else next.add(exIdx);
                        setExpandedPlanExercises(next);
                      }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: theme.navBackground, color: theme.textMuted }}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* 세트 상세 (드롭다운) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${theme.line}` }}>

                          {/* ——— 편집 패널 ——— */}
                          {isEditOpen && editingExercise && editingExercise.id === exercise.id && (
                            <div className="pt-3 space-y-2">
                              {/* 이름 인라인 편집 */}
                              <input
                                type="text"
                                value={editingExercise.name}
                                onChange={e => setEditingExercise({ ...editingExercise, name: e.target.value })}
                                className="w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none"
                                style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                              />

                              {/* 세트 헤더 */}
                              <div className="grid grid-cols-[24px_32px_1fr_1fr_28px_28px] gap-1.5 px-1">
                                {['', '세트', '무게(kg)', '횟수', 'W', ''].map((h, i) => (
                                  <span key={i} className="text-[10px] font-semibold text-center" style={{ color: theme.textMuted }}>{h}</span>
                                ))}
                              </div>

                              {/* 세트 행 (드래그 가능) */}
                              {editingExercise.sets.map((set, sIdx) => (
                                <div
                                  key={set.id}
                                  draggable
                                  onDragStart={() => handleSetDragStart(sIdx)}
                                  onDragOver={(e) => handleSetDragOver(e, sIdx)}
                                  onDrop={handleSetDrop}
                                  onDragEnd={() => { setDragFromSetIdx(null); setDragOverSetIdx(null); }}
                                  className="grid grid-cols-[24px_32px_1fr_1fr_28px_28px] gap-1.5 items-center rounded-xl px-1 py-1.5 transition-all"
                                  style={{
                                    background: dragOverSetIdx === sIdx && dragFromSetIdx !== sIdx
                                      ? `${theme.primary}15`
                                      : dragFromSetIdx === sIdx
                                      ? `${theme.textMuted}10`
                                      : 'transparent',
                                    opacity: dragFromSetIdx === sIdx ? 0.5 : 1,
                                    cursor: 'grab',
                                  }}
                                >
                                  {/* 드래그 핸들 */}
                                  <div className="flex justify-center cursor-grab">
                                    <GripVertical className="h-4 w-4" style={{ color: theme.textMuted }} />
                                  </div>

                                  {/* 세트 번호 */}
                                  <div className="flex justify-center">
                                    <span
                                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg cursor-pointer select-none"
                                      style={{
                                        background: set.isWarmup ? `${theme.textMuted}15` : `${theme.primary}15`,
                                        color: set.isWarmup ? theme.textMuted : theme.primary,
                                      }}
                                      onClick={() => setEditingExercise({
                                        ...editingExercise,
                                        sets: editingExercise.sets.map((s, i) => i === sIdx ? { ...s, isWarmup: !s.isWarmup } : s)
                                      })}
                                      title="클릭해서 워밍업 토글"
                                    >
                                      {set.isWarmup ? 'W' : sIdx - editingExercise.sets.filter((s, i) => s.isWarmup && i < sIdx).length + 1}
                                    </span>
                                  </div>

                                  {/* 무게 */}
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => updateEditSet(sIdx, 'weight', -2.5)} className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}><Minus className="h-3 w-3" /></button>
                                    <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>{set.weight}</span>
                                    <button onClick={() => updateEditSet(sIdx, 'weight', 2.5)} className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}><Plus className="h-3 w-3" /></button>
                                  </div>

                                  {/* 횟수 */}
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => updateEditSet(sIdx, 'reps', -1)} className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}><Minus className="h-3 w-3" /></button>
                                    <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>{set.reps}</span>
                                    <button onClick={() => updateEditSet(sIdx, 'reps', 1)} className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}><Plus className="h-3 w-3" /></button>
                                  </div>

                                  {/* 워밍업 체크박스 */}
                                  <div className="flex justify-center">
                                    <button
                                      onClick={() => setEditingExercise({
                                        ...editingExercise,
                                        sets: editingExercise.sets.map((s, i) => i === sIdx ? { ...s, isWarmup: !s.isWarmup } : s)
                                      })}
                                      className="h-5 w-5 rounded-md flex items-center justify-center border transition-all"
                                      style={{
                                        background: set.isWarmup ? `${theme.textMuted}30` : 'transparent',
                                        borderColor: set.isWarmup ? theme.textMuted : theme.line,
                                      }}
                                      title="워밍업"
                                    >
                                      {set.isWarmup && <Check className="h-3 w-3" style={{ color: theme.textMuted }} />}
                                    </button>
                                  </div>

                                  {/* 삭제 */}
                                  <button onClick={() => removeSetFromEditExercise(sIdx)} className="h-5 w-5 rounded-md flex items-center justify-center mx-auto" style={{ background: `#ef444420`, color: '#ef4444' }}>
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}

                              {/* 버튼들 */}
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => addSetToEditExercise(false)} className="flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold border" style={{ borderColor: theme.line, color: theme.textSecondary }}>
                                  <Plus className="h-3 w-3" /> 세트 추가
                                </button>
                                <button onClick={() => addSetToEditExercise(true)} className="flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold border" style={{ borderColor: theme.line, color: theme.textMuted }}>
                                  <Plus className="h-3 w-3" /> 워밍업
                                </button>
                                <button onClick={handleSaveExercise} className="rounded-xl px-4 py-1.5 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})` }}>
                                  저장
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ——— 일반 세트 뷰 ——— */}
                          {!isEditOpen && (
                            <>
                              <div className="grid grid-cols-[32px_32px_1fr_1fr_32px] gap-2 pt-3 pb-1">
                                {['', '세트', '무게(kg)', '횟수', ''].map((h, i) => (
                                  <span key={i} className="text-[10px] font-semibold text-center" style={{ color: theme.textMuted }}>{h}</span>
                                ))}
                              </div>

                              {exercise.sets.map((set, sIdx) => {
                                const setKey = `${exercise.id}-${sIdx}`;
                                const isSetChecked = checkedSets.has(setKey);

                                return (
                                  <motion.div
                                    key={set.id}
                                    animate={{
                                      borderColor: isSetChecked ? theme.primary : 'transparent',
                                      boxShadow: isSetChecked ? `0 0 0 1.5px ${theme.primary}50` : 'none',
                                      background: isSetChecked ? `${theme.primary}08` : set.isWarmup ? `${theme.textMuted}06` : 'transparent',
                                    }}
                                    transition={{ duration: 0.25 }}
                                    className="grid grid-cols-[32px_32px_1fr_1fr_32px] gap-2 items-center rounded-xl px-1 py-2 border border-transparent"
                                  >
                                    {/* 세트 체크박스 */}
                                    <div className="flex justify-center">
                                      <motion.button
                                        whileTap={{ scale: 0.8 }}
                                        onClick={() => toggleSetCheck(exercise.id, sIdx, exercise)}
                                        className="h-5 w-5 rounded-md flex items-center justify-center border-2 transition-all"
                                        style={{
                                          background: isSetChecked ? theme.primary : 'transparent',
                                          borderColor: isSetChecked ? theme.primary : theme.line,
                                        }}
                                      >
                                        {isSetChecked && <Check className="h-3 w-3 text-white" />}
                                      </motion.button>
                                    </div>

                                    {/* 세트 번호 */}
                                    <div className="flex justify-center">
                                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg" style={{ background: set.isWarmup ? `${theme.textMuted}15` : `${theme.primary}15`, color: set.isWarmup ? theme.textMuted : theme.primary }}>
                                        {set.isWarmup ? 'W' : sIdx - exercise.sets.filter((s, i) => s.isWarmup && i < sIdx).length + 1}
                                      </span>
                                    </div>

                                    {/* 무게 */}
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => updatePlanWeight(exercise.id, sIdx, -2.5)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>{set.weight}</span>
                                      <button onClick={() => updatePlanWeight(exercise.id, sIdx, 2.5)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>

                                    {/* 횟수 */}
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => updatePlanReps(exercise.id, sIdx, -1)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>{set.reps}</span>
                                      <button onClick={() => updatePlanReps(exercise.id, sIdx, 1)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.navBackground, color: theme.textMuted }}>
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>

                                    {/* 빈 공간 */}
                                    <div />
                                  </motion.div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* 운동 추가 섹션 */}
          {showAddExercise ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newExerciseName}
                onChange={e => setNewExerciseName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddExercise()}
                placeholder="운동 이름 입력"
                autoFocus
                className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
              />
              <button onClick={handleAddExercise} className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})` }}>추가</button>
              <button onClick={() => { setShowAddExercise(false); setNewExerciseName(''); }} className="rounded-xl px-3 py-2 text-sm border" style={{ borderColor: theme.line, color: theme.textMuted }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddExercise(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold border border-dashed"
              style={{ borderColor: theme.primary, color: theme.primary }}
            >
              <Plus className="h-4 w-4" /> 운동 추가
            </button>
          )}

          {/* 하단 액션 버튼 */}
          <div className="flex gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startDirectRecord}
              disabled={!anyChecked}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold border disabled:opacity-40"
              style={{ borderColor: theme.primary, color: theme.primary, background: `${theme.primary}08` }}
            >
              <ClipboardList className="h-5 w-5" />
              기록하기
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startTrackingSession}
              disabled={!anyChecked}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                boxShadow: anyChecked ? `0 8px 24px ${theme.primary}40` : 'none',
              }}
            >
              <Play className="h-5 w-5" />
              운동 시작
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
