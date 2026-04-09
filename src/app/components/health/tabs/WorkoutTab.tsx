import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../../../context/HealthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Play,
  Pause,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Timer,
  Dumbbell,
  Trophy,
  RotateCcw,
  X,
  CheckCircle2,
  Pencil,
  Trash2,
  BedDouble,
  GripVertical,
} from 'lucide-react';
import { WorkoutExercise, WorkoutSet } from '../../../types/health';
import { toast } from '../../../lib/toast';
import { syncWorkoutRecordToPlannedEvent } from '../../../lib/plannerWorkoutSync';

interface WorkoutTabProps {
  theme: any;
}

interface ActiveSession {
  weekNumber: number;
  dayOfWeek: number;
  exercises: WorkoutExercise[];
  startTime: string;
  completedSets: Set<string>; // "exerciseIdx-setIdx"
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function WorkoutTab({ theme }: WorkoutTabProps) {
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

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Plan editor state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editWeek, setEditWeek] = useState(1);
  const [editDayOfWeek, setEditDayOfWeek] = useState<number | null>(null);
  // Editing a specific exercise
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  // Adding a new exercise
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDayOfWeek = today.getDay();

  const alreadyWorkoutedToday = workoutRecords.some(r => r.date === todayStr);

  // 주차별 운동 계획 목록
  const currentWeekPlan = weekPlans.find(p => p.weekNumber === currentWeek);
  const plannedDays = currentWeekPlan?.days.filter(d => !d.isRestDay && d.exercises.length > 0) || [];

  // 운동 시간 타이머
  useEffect(() => {
    if (session) {
      workoutTimerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => { if (workoutTimerRef.current) clearInterval(workoutTimerRef.current); };
  }, [session]);

  // 휴식 타이머
  useEffect(() => {
    if (isResting && restTimer > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t <= 1) {
            setIsResting(false);
            clearInterval(restTimerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [isResting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startWorkout = (dayOfWeek: number) => {
    const plan = currentWeekPlan?.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!plan || plan.exercises.length === 0) return;

    // 딥카피로 운동 데이터 복사
    const exercises: WorkoutExercise[] = plan.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({ ...set, completed: false })),
    }));

    setSession({
      weekNumber: currentWeek,
      dayOfWeek,
      exercises,
      startTime: new Date().toISOString(),
      completedSets: new Set(),
    });
    setExpandedExercise(0);
    setElapsedSeconds(0);
    toast.success('운동을 시작합니다! 파이팅!');
  };

  const toggleSet = useCallback((exerciseIdx: number, setIdx: number) => {
    if (!session) return;
    const key = `${exerciseIdx}-${setIdx}`;
    const newCompleted = new Set(session.completedSets);

    if (newCompleted.has(key)) {
      newCompleted.delete(key);
      setSession(s => s ? { ...s, completedSets: newCompleted } : null);
    } else {
      newCompleted.add(key);
      setSession(s => s ? { ...s, completedSets: newCompleted } : null);

      // 워밍업이 아닌 세트 완료 시 휴식 타이머 시작
      const set = session.exercises[exerciseIdx]?.sets[setIdx];
      if (set && !set.isWarmup) {
        setRestTimer(settings.defaultRestTime || 90);
        setIsResting(true);
      }
    }
  }, [session, settings.defaultRestTime]);

  const updateWeight = (exerciseIdx: number, setIdx: number, delta: number) => {
    if (!session) return;
    setSession(s => {
      if (!s) return null;
      const exercises = s.exercises.map((ex, ei) =>
        ei === exerciseIdx
          ? {
              ...ex,
              sets: ex.sets.map((set, si) =>
                si === setIdx
                  ? { ...set, weight: Math.max(0, (set.weight || 0) + delta) }
                  : set
              ),
            }
          : ex
      );
      return { ...s, exercises };
    });
  };

  const updateReps = (exerciseIdx: number, setIdx: number, delta: number) => {
    if (!session) return;
    setSession(s => {
      if (!s) return null;
      const exercises = s.exercises.map((ex, ei) =>
        ei === exerciseIdx
          ? {
              ...ex,
              sets: ex.sets.map((set, si) =>
                si === setIdx
                  ? { ...set, reps: Math.max(1, (set.reps || 0) + delta) }
                  : set
              ),
            }
          : ex
      );
      return { ...s, exercises };
    });
  };

  const finishWorkout = async () => {
    if (!session) return;

    const endTime = new Date().toISOString();
    const totalVolume = session.exercises.reduce((sum, ex) => {
      return sum + ex.sets.reduce((sSum, set) => {
        const key = `${session.exercises.indexOf(ex)}-${ex.sets.indexOf(set)}`;
        if (!set.isWarmup && session.completedSets.has(key)) {
          return sSum + (set.weight || 0) * (set.reps || 0);
        }
        return sSum;
      }, 0);
    }, 0);

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

    await addWorkoutRecord({
      date: record.date,
      weekNumber: record.weekNumber,
      dayOfWeek: record.dayOfWeek,
      exercises: record.exercises,
      startTime: record.startTime,
      endTime: record.endTime,
      totalVolume: record.totalVolume,
    });

    // 캘린더 앱의 운동 일정 메모에 운동 기록 동기화
    syncWorkoutRecordToPlannedEvent(record);

    setSession(null);
    setIsResting(false);
    setRestTimer(0);
    setShowFinishConfirm(false);
    toast.success(`운동 완료! 총 볼륨: ${totalVolume.toLocaleString()}kg`);
  };

  const completedSetsCount = session?.completedSets.size || 0;
  const totalSetsCount = session?.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => !s.isWarmup).length, 0) || 0;

  // ——— Plan Editor Helpers ———
  const editWeekPlan = weekPlans.find(p => p.weekNumber === editWeek);
  const editDay = editWeekPlan?.days.find(d => d.dayOfWeek === editDayOfWeek);

  const handleToggleRestDay = async (dow: number) => {
    const day = editWeekPlan?.days.find(d => d.dayOfWeek === dow);
    if (!day) return;
    await updateDayRoutine(editWeek, dow, { isRestDay: !day.isRestDay });
  };

  const handleUpdateRoutineName = async (name: string) => {
    if (editDayOfWeek === null) return;
    await updateDayRoutine(editWeek, editDayOfWeek, { routineName: name });
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim() || editDayOfWeek === null) return;
    await addExerciseToDayRoutine(editWeek, editDayOfWeek, {
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

  const handleRemoveExercise = async (exerciseId: string) => {
    if (editDayOfWeek === null) return;
    await removeExerciseFromDayRoutine(editWeek, editDayOfWeek, exerciseId);
    if (editingExercise?.id === exerciseId) setEditingExercise(null);
    toast.success('운동 삭제됨');
  };

  const handleSaveExercise = async () => {
    if (!editingExercise || editDayOfWeek === null) return;
    await updateExerciseInDayRoutine(editWeek, editDayOfWeek, editingExercise);
    setEditingExercise(null);
    setEditingExerciseIdx(null);
    toast.success('저장됨');
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
    setEditingExercise({
      ...editingExercise,
      sets: editingExercise.sets.filter((_, i) => i !== setIdx),
    });
  };

  // ——— Edit Mode UI ———
  if (isEditMode) {
    return (
      <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
              Plan Editor
            </p>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>루틴 편집</h1>
          </div>
          <button
            onClick={() => { setIsEditMode(false); setEditDayOfWeek(null); setEditingExercise(null); }}
            className="rounded-2xl px-4 py-2 text-sm font-bold border"
            style={{ borderColor: theme.line, color: theme.textSecondary }}
          >
            완료
          </button>
        </div>

        {/* 주차 선택 */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(w => (
            <button
              key={w}
              onClick={() => { setEditWeek(w); setEditDayOfWeek(null); setEditingExercise(null); }}
              className="flex-1 rounded-2xl py-2.5 text-sm font-bold border transition-all"
              style={{
                background: editWeek === w ? theme.primary : theme.panelBackground,
                borderColor: editWeek === w ? theme.primary : theme.line,
                color: editWeek === w ? '#fff' : theme.textSecondary,
              }}
            >
              {w}주차
            </button>
          ))}
        </div>

        {/* 요일 선택 */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((label, dow) => {
            const day = editWeekPlan?.days.find(d => d.dayOfWeek === dow);
            const isRest = day?.isRestDay ?? false;
            const exCount = day?.exercises.length ?? 0;
            const isSelected = editDayOfWeek === dow;
            return (
              <button
                key={dow}
                onClick={() => { setEditDayOfWeek(isSelected ? null : dow); setEditingExercise(null); setShowAddExercise(false); }}
                className="rounded-2xl p-2.5 text-center border transition-all"
                style={{
                  background: isSelected ? `${theme.primary}15` : theme.panelBackground,
                  borderColor: isSelected ? theme.primary : isRest ? theme.line : exCount > 0 ? `${theme.primary}40` : theme.line,
                }}
              >
                <div
                  className="text-xs font-black mb-1"
                  style={{ color: isSelected ? theme.primary : isRest ? theme.textMuted : theme.text }}
                >
                  {label}
                </div>
                <div
                  className="text-[10px]"
                  style={{ color: isRest ? theme.textMuted : exCount > 0 ? theme.primary : theme.textMuted }}
                >
                  {isRest ? '휴식' : exCount > 0 ? `${exCount}종목` : '없음'}
                </div>
              </button>
            );
          })}
        </div>

        {/* 선택된 요일 편집 */}
        {editDayOfWeek !== null && editDay && (
          <div
            className="rounded-2xl border p-4 md:p-5 space-y-4"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            {/* 요일 헤더 */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: theme.text }}>
                {DAY_LABELS[editDayOfWeek]}요일
              </h2>
              <button
                onClick={() => handleToggleRestDay(editDayOfWeek)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all"
                style={{
                  background: editDay.isRestDay ? `${theme.primary}15` : 'transparent',
                  borderColor: editDay.isRestDay ? theme.primary : theme.line,
                  color: editDay.isRestDay ? theme.primary : theme.textMuted,
                }}
              >
                <BedDouble className="h-3.5 w-3.5" />
                {editDay.isRestDay ? '휴식일 해제' : '휴식일 설정'}
              </button>
            </div>

            {!editDay.isRestDay && (
              <>
                {/* 루틴 이름 */}
                <input
                  type="text"
                  defaultValue={editDay.routineName || ''}
                  onBlur={e => handleUpdateRoutineName(e.target.value)}
                  placeholder={`${DAY_LABELS[editDayOfWeek]}요일 루틴 이름 (선택)`}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                />

                {/* 운동 목록 */}
                <div className="space-y-2">
                  {editDay.exercises.map((exercise, exIdx) => {
                    const isEditing = editingExercise?.id === exercise.id;
                    return (
                      <div
                        key={exercise.id}
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: isEditing ? theme.primary : theme.line }}
                      >
                        {/* 운동 헤더 */}
                        <div
                          className="flex items-center gap-3 p-3"
                          style={{ background: isEditing ? `${theme.primary}08` : theme.navBackground }}
                        >
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                            style={{ background: `${theme.primary}15`, color: theme.primary }}
                          >
                            {exIdx + 1}
                          </div>
                          <span className="flex-1 text-sm font-bold" style={{ color: theme.text }}>
                            {exercise.name}
                          </span>
                          <span className="text-xs" style={{ color: theme.textMuted }}>
                            {exercise.sets.filter(s => !s.isWarmup).length}세트
                          </span>
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingExercise(null);
                                setEditingExerciseIdx(null);
                              } else {
                                setEditingExercise({ ...exercise, sets: exercise.sets.map(s => ({ ...s })) });
                                setEditingExerciseIdx(exIdx);
                              }
                            }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center"
                            style={{ background: isEditing ? `${theme.primary}20` : theme.line, color: isEditing ? theme.primary : theme.textMuted }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveExercise(exercise.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center"
                            style={{ background: `#ef444420`, color: '#ef4444' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* 세트 편집 */}
                        {isEditing && editingExercise && (
                          <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${theme.line}` }}>
                            {/* 운동명 편집 */}
                            <input
                              type="text"
                              value={editingExercise.name}
                              onChange={e => setEditingExercise({ ...editingExercise, name: e.target.value })}
                              className="w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none mb-3"
                              style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                            />

                            {/* 세트 헤더 */}
                            <div className="grid grid-cols-[40px_1fr_1fr_32px] gap-2 px-1">
                              {['세트', '무게(kg)', '횟수', ''].map(h => (
                                <span key={h} className="text-[10px] font-semibold text-center" style={{ color: theme.textMuted }}>{h}</span>
                              ))}
                            </div>

                            {editingExercise.sets.map((set, sIdx) => (
                              <div key={set.id} className="grid grid-cols-[40px_1fr_1fr_32px] gap-2 items-center">
                                <div className="flex justify-center">
                                  <span
                                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg"
                                    style={{
                                      background: set.isWarmup ? `${theme.textMuted}15` : `${theme.primary}15`,
                                      color: set.isWarmup ? theme.textMuted : theme.primary,
                                    }}
                                  >
                                    {set.isWarmup ? 'W' : sIdx - editingExercise.sets.filter((s, i) => s.isWarmup && i < sIdx).length + 1}
                                  </span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => updateEditSet(sIdx, 'weight', -2.5)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}>
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="text-xs font-bold w-9 text-center" style={{ color: theme.text }}>{set.weight}</span>
                                  <button onClick={() => updateEditSet(sIdx, 'weight', 2.5)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}>
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => updateEditSet(sIdx, 'reps', -1)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}>
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="text-xs font-bold w-9 text-center" style={{ color: theme.text }}>{set.reps}</span>
                                  <button onClick={() => updateEditSet(sIdx, 'reps', 1)} className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: theme.line, color: theme.textMuted }}>
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeSetFromEditExercise(sIdx)}
                                  className="h-6 w-6 rounded-lg flex items-center justify-center mx-auto"
                                  style={{ background: `#ef444420`, color: '#ef4444' }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}

                            {/* 세트 추가 버튼들 */}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => addSetToEditExercise(false)}
                                className="flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold border"
                                style={{ borderColor: theme.line, color: theme.textSecondary }}
                              >
                                <Plus className="h-3 w-3" /> 세트 추가
                              </button>
                              <button
                                onClick={() => addSetToEditExercise(true)}
                                className="flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold border"
                                style={{ borderColor: theme.line, color: theme.textMuted }}
                              >
                                <Plus className="h-3 w-3" /> 워밍업 추가
                              </button>
                              <button
                                onClick={handleSaveExercise}
                                className="rounded-xl px-4 py-1.5 text-xs font-bold text-white"
                                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 운동 추가 */}
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
                    <button
                      onClick={handleAddExercise}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                    >
                      추가
                    </button>
                    <button
                      onClick={() => { setShowAddExercise(false); setNewExerciseName(''); }}
                      className="rounded-xl px-3 py-2 text-sm border"
                      style={{ borderColor: theme.line, color: theme.textMuted }}
                    >
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
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // 세션 없을 때 - 운동 선택 화면
  if (!session) {
    return (
      <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
              Training
            </p>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>운동 시작</h1>
          </div>
          <button
            onClick={() => { setIsEditMode(true); setEditWeek(currentWeek); }}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold border mt-1"
            style={{ borderColor: theme.line, color: theme.textSecondary, background: theme.panelBackground }}
          >
            <Pencil className="h-3.5 w-3.5" />
            루틴 편집
          </button>
        </div>

        {alreadyWorkoutedToday && (
          <div
            className="rounded-2xl border p-4 flex items-center gap-3"
            style={{ background: `${theme.primary}10`, borderColor: `${theme.primary}30` }}
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: theme.primary }} />
            <div>
              <p className="text-sm font-bold" style={{ color: theme.text }}>오늘 운동 완료!</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>이미 오늘의 운동을 기록했어요</p>
            </div>
          </div>
        )}

        {plannedDays.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: theme.textMuted }} />
            <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>루틴이 없어요</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>홈에서 주차를 선택하거나 루틴을 추가해주세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
              {currentWeek}주차 루틴 선택
            </p>
            {plannedDays.map(day => {
              const isToday = day.dayOfWeek === todayDayOfWeek;
              return (
                <motion.div
                  key={day.dayOfWeek}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-2xl border p-4 cursor-pointer transition-all"
                  style={{
                    background: isToday ? `${theme.primary}10` : theme.panelBackground,
                    borderColor: isToday ? `${theme.primary}40` : theme.panelBorder,
                  }}
                  onClick={() => startWorkout(day.dayOfWeek)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm"
                        style={{
                          background: isToday ? theme.primary : `${theme.primary}15`,
                          color: isToday ? '#fff' : theme.primary,
                        }}
                      >
                        {DAY_LABELS[day.dayOfWeek]}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: theme.text }}>
                          {day.routineName || `${DAY_LABELS[day.dayOfWeek]}요일 운동`}
                          {isToday && (
                            <span
                              className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${theme.primary}20`, color: theme.primary }}
                            >
                              오늘
                            </span>
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                          {day.exercises.map(e => e.name).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                        {day.exercises.length}가지
                      </span>
                      <Play className="h-5 w-5" style={{ color: theme.primary }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 운동 중 화면
  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 운동 헤더 */}
      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent1 || theme.secondary || theme.primary}10)`,
          borderColor: `${theme.primary}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.primary }}>
              운동 중
            </p>
            <h2 className="text-xl font-black" style={{ color: theme.text }}>
              {currentWeekPlan?.days.find(d => d.dayOfWeek === session.dayOfWeek)?.routineName || `${DAY_LABELS[session.dayOfWeek]}요일 운동`}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums" style={{ color: theme.primary }}>
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
              {completedSetsCount}/{totalSetsCount} 세트
            </p>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: theme.line }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: theme.primary }}
            animate={{ width: totalSetsCount > 0 ? `${(completedSetsCount / totalSetsCount) * 100}%` : '0%' }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* 휴식 타이머 */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border p-4 flex items-center justify-between overflow-hidden"
            style={{ background: `${theme.primary}15`, borderColor: `${theme.primary}40` }}
          >
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" style={{ color: theme.primary }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: theme.primary }}>휴식 중</p>
                <p className="text-xl font-black tabular-nums" style={{ color: theme.text }}>
                  {formatTime(restTimer)}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setIsResting(false); setRestTimer(0); }}
              className="rounded-xl px-3 py-1.5 text-xs font-bold"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              건너뛰기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 운동 목록 */}
      <div className="space-y-3">
        {session.exercises.map((exercise, exIdx) => {
          const isExpanded = expandedExercise === exIdx;
          const completedCount = exercise.sets.filter((_, sIdx) =>
            session.completedSets.has(`${exIdx}-${sIdx}`) && !exercise.sets[sIdx].isWarmup
          ).length;
          const mainSets = exercise.sets.filter(s => !s.isWarmup);

          return (
            <motion.div
              key={exercise.id}
              layout
              className="rounded-2xl border overflow-hidden"
              style={{
                background: theme.panelBackground,
                borderColor: completedCount === mainSets.length && mainSets.length > 0
                  ? `${theme.primary}40`
                  : theme.panelBorder,
              }}
            >
              {/* 운동 헤더 */}
              <button
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setExpandedExercise(isExpanded ? null : exIdx)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{
                      background: completedCount === mainSets.length && mainSets.length > 0
                        ? `${theme.primary}20`
                        : `${theme.primary}10`,
                      color: theme.primary,
                    }}
                  >
                    {completedCount === mainSets.length && mainSets.length > 0
                      ? <Check className="h-4 w-4" />
                      : exIdx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>
                      {exercise.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                      {completedCount}/{mainSets.length} 세트 완료
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" style={{ color: theme.textMuted }} />
                ) : (
                  <ChevronDown className="h-5 w-5" style={{ color: theme.textMuted }} />
                )}
              </button>

              {/* 세트 상세 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${theme.line}` }}>
                      <div className="grid grid-cols-4 gap-2 pt-3 pb-1">
                        {['세트', '무게(kg)', '횟수', '완료'].map(h => (
                          <span key={h} className="text-[10px] font-semibold text-center" style={{ color: theme.textMuted }}>
                            {h}
                          </span>
                        ))}
                      </div>

                      {exercise.sets.map((set, sIdx) => {
                        const key = `${exIdx}-${sIdx}`;
                        const isDone = session.completedSets.has(key);

                        return (
                          <div
                            key={set.id}
                            className="grid grid-cols-4 gap-2 items-center rounded-xl px-2 py-2 transition-all"
                            style={{
                              background: isDone ? `${theme.primary}10` : set.isWarmup ? `${theme.textMuted}08` : 'transparent',
                            }}
                          >
                            {/* 세트 번호 */}
                            <div className="text-center">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-lg"
                                style={{
                                  background: set.isWarmup ? `${theme.textMuted}15` : `${theme.primary}15`,
                                  color: set.isWarmup ? theme.textMuted : theme.primary,
                                }}
                              >
                                {set.isWarmup ? 'W' : sIdx - exercise.sets.filter((s, i) => s.isWarmup && i < sIdx).length + 1}
                              </span>
                            </div>

                            {/* 무게 */}
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateWeight(exIdx, sIdx, -2.5)}
                                className="h-6 w-6 rounded-lg flex items-center justify-center"
                                style={{ background: theme.navBackground, color: theme.textMuted }}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>
                                {set.weight}
                              </span>
                              <button
                                onClick={() => updateWeight(exIdx, sIdx, 2.5)}
                                className="h-6 w-6 rounded-lg flex items-center justify-center"
                                style={{ background: theme.navBackground, color: theme.textMuted }}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* 횟수 */}
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateReps(exIdx, sIdx, -1)}
                                className="h-6 w-6 rounded-lg flex items-center justify-center"
                                style={{ background: theme.navBackground, color: theme.textMuted }}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-bold w-8 text-center" style={{ color: theme.text }}>
                                {set.reps}
                              </span>
                              <button
                                onClick={() => updateReps(exIdx, sIdx, 1)}
                                className="h-6 w-6 rounded-lg flex items-center justify-center"
                                style={{ background: theme.navBackground, color: theme.textMuted }}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* 완료 체크 */}
                            <div className="flex justify-center">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => toggleSet(exIdx, sIdx)}
                                className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                                style={{
                                  background: isDone ? theme.primary : `${theme.primary}15`,
                                  color: isDone ? '#fff' : theme.primary,
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* 운동 종료 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowFinishConfirm(true)}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.secondary || theme.primary})`,
            boxShadow: `0 8px 24px ${theme.primary}40`,
          }}
        >
          <Trophy className="h-5 w-5" />
          운동 완료
        </button>
        <button
          onClick={() => setSession(null)}
          className="rounded-2xl px-5 py-4 text-sm font-bold border"
          style={{ borderColor: theme.line, color: theme.textMuted }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

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
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                backdropFilter: 'blur(20px)',
              }}
            >
              <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: theme.primary }} />
              <h3 className="text-xl font-black mb-2" style={{ color: theme.text }}>운동 종료</h3>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>
                운동 시간: {formatTime(elapsedSeconds)}
              </p>
              <p className="text-sm mb-4" style={{ color: theme.textSecondary }}>
                완료 세트: {completedSetsCount}/{totalSetsCount}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold border"
                  style={{ borderColor: theme.line, color: theme.textMuted }}
                >
                  계속
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={finishWorkout}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.primary})`,
                    boxShadow: `0 8px 24px ${theme.primary}30`,
                  }}
                >
                  저장 완료
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
