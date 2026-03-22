import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../../../context/HealthContext';
import { Flame, Plus, X, ChevronDown, ChevronUp, Calendar, TrendingUp, Zap, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '../../../lib/toast';

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

interface HomeTabProps {
  theme: any;
}

export function HomeTab({ theme }: HomeTabProps) {
  const {
    weekPlans,
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
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showRecordMode, setShowRecordMode] = useState(false);
  const [showEditRoutineName, setShowEditRoutineName] = useState(false);
  const [editingRoutineName, setEditingRoutineName] = useState('');
  
  const currentPlan = getCurrentWeekPlan();
  const selectedDayData = currentPlan?.days.find(d => d.dayOfWeek === selectedDay);
  
  const currentStreak = getCurrentStreak();
  const monthlyCount = getMonthlyWorkoutCount(new Date().getFullYear(), new Date().getMonth());
  
  // 완료된 세트 계산
  const totalSets = selectedDayData?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
  const completedSets = selectedDayData?.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length, 
    0
  ) || 0;
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  // 이번 주 운동 기록 확인
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return workoutRecords.some(r => r.date === dateStr);
  });

  const handleAddExercise = async (name: string) => {
    if (!name.trim()) return;
    
    await addExerciseToDayRoutine(currentWeek, selectedDay, {
      name: name.trim(),
      sets: [
        { id: `s-${Date.now()}`, weight: 0, reps: 0, isWarmup: false, completed: false },
      ],
    });
    setShowAddExercise(false);
  };

  const handleAddSet = async (exerciseId: string) => {
    const exercise = selectedDayData?.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const updatedExercises = selectedDayData.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { id: `s-${Date.now()}`, weight: 0, reps: 0, isWarmup: false, completed: false },
          ],
        };
      }
      return ex;
    });

    await updateDayRoutine(currentWeek, selectedDay, { exercises: updatedExercises });
  };

  const handleUpdateSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    const updatedExercises = selectedDayData?.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s),
        };
      }
      return ex;
    });

    if (updatedExercises) {
      await updateDayRoutine(currentWeek, selectedDay, { exercises: updatedExercises });
    }
  };

  const handleToggleSetComplete = async (exerciseId: string, setId: string) => {
    const updatedExercises = selectedDayData?.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, completed: !s.completed } : s),
        };
      }
      return ex;
    });

    if (updatedExercises) {
      await updateDayRoutine(currentWeek, selectedDay, { exercises: updatedExercises });
    }
  };

  const handleToggleAllSets = async (exerciseId: string) => {
    const exercise = selectedDayData?.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const allCompleted = exercise.sets.every(s => s.completed);
    
    const updatedExercises = selectedDayData?.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => ({ ...s, completed: !allCompleted })),
        };
      }
      return ex;
    });

    if (updatedExercises) {
      await updateDayRoutine(currentWeek, selectedDay, { exercises: updatedExercises });
    }
  };

  const handleSaveRecord = async () => {
    if (!selectedDayData) return;

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    
    await addWorkoutRecord({
      date: dateStr,
      weekNumber: currentWeek,
      dayOfWeek: selectedDay,
      exercises: selectedDayData.exercises,
      duration: 0,
      totalVolume: selectedDayData.exercises.reduce((sum, ex) => 
        sum + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0
      ),
    });

    toast.success('운동 기록이 저장되었습니다.');
    setShowRecordMode(false);
  };

  const handleEditRoutineName = () => {
    setEditingRoutineName(selectedDayData?.routineName || '');
    setShowEditRoutineName(true);
  };

  const handleSaveRoutineName = async () => {
    if (!selectedDayData) return;
    
    await updateDayRoutine(currentWeek, selectedDay, {
      routineName: editingRoutineName.trim() || undefined,
    });
    
    setShowEditRoutineName(false);
  };

  // 루틴 이름 가져오기
  const getRoutineName = () => {
    return selectedDayData?.routineName || `${DAYS_OF_WEEK[selectedDay]}요일 루틴`;
  };
  
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bg }}>
      <div className="pt-20 pb-6 px-4 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-4xl font-black mb-1 tracking-tight" style={{ color: theme.text }}>
            TODAY'S WORKOUT
          </h1>
          <p className="text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
            {format(new Date(), 'M월 d일 EEEE', { locale: ko })} · {settings.name || '사용자'}
          </p>
        </div>

        {/* 데스크탑: 3열 그리드 / 모바일: 1열 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          {/* 연속 출석 카드 */}
          <div 
            className="rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl md:shadow-2xl border relative overflow-hidden"
            style={{ 
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            }}
          >
            <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 opacity-5">
              <Flame className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <Flame className="w-4 h-4 md:w-6 md:h-6 text-orange-500" />
                <span className="text-xs md:text-sm font-bold" style={{ color: theme.textSecondary }}>연속 출석</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-5xl font-black" style={{ color: theme.text }}>{currentStreak}</span>
                <span className="text-base md:text-xl font-bold" style={{ color: theme.textMuted }}>일</span>
              </div>
            </div>
          </div>

          {/* 이번 달 운동 카드 */}
          <div 
            className="rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl md:shadow-2xl border relative overflow-hidden"
            style={{ 
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            }}
          >
            <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 opacity-5">
              <Calendar className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <Calendar className="w-4 h-4 md:w-6 md:h-6" style={{ color: theme.primary }} />
                <span className="text-xs md:text-sm font-bold" style={{ color: theme.textSecondary }}>이번 달</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-5xl font-black" style={{ color: theme.text }}>{monthlyCount}</span>
                <span className="text-base md:text-xl font-bold" style={{ color: theme.textMuted }}>회</span>
              </div>
            </div>
          </div>

          {/* 진행률 카드 */}
          <div 
            className="rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl md:shadow-2xl border relative overflow-hidden"
            style={{ 
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            }}
          >
            <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 opacity-5">
              <TrendingUp className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <Zap className="w-4 h-4 md:w-6 md:h-6" style={{ color: theme.primary }} />
                <span className="text-xs md:text-sm font-bold" style={{ color: theme.textSecondary }}>오늘 진행률</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-5xl font-black" style={{ color: theme.text }}>{progressPercent}</span>
                <span className="text-base md:text-xl font-bold" style={{ color: theme.textMuted }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 주간 활동 도트 */}
        <div 
          className="rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-6 shadow-xl md:shadow-2xl border"
          style={{ 
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          }}
        >
          <h3 className="text-xs md:text-sm font-bold mb-3 md:mb-4" style={{ color: theme.textSecondary }}>이번 주 활동</h3>
          <div className="flex items-center justify-between gap-1 md:gap-2">
            {weekDots.map((hasWorkout, i) => (
              <div key={i} className="flex flex-col items-center gap-1 md:gap-2 flex-1">
                <div
                  className="w-full aspect-square max-w-[40px] md:max-w-[60px] rounded-xl md:rounded-2xl flex items-center justify-center text-base md:text-xl font-black transition-all"
                  style={{
                    backgroundColor: i === new Date().getDay()
                      ? theme.primary
                      : hasWorkout
                      ? theme.accent
                      : theme.cardBorder,
                    color: i === new Date().getDay() ? theme.bg : theme.textMuted,
                  }}
                >
                  {hasWorkout ? '✓' : ''}
                </div>
                <span className="text-[10px] md:text-xs font-bold" style={{ color: theme.textMuted }}>
                  {DAYS_OF_WEEK[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 주차 선택 - 펼쳐진 형태 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
          {[1, 2, 3, 4].map(week => (
            <button
              key={week}
              onClick={() => setCurrentWeek(week)}
              className="py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-sm md:text-base transition-all shadow-sm md:shadow-md"
              style={{
                backgroundColor: currentWeek === week ? theme.primary : theme.card,
                color: currentWeek === week ? theme.bg : theme.textMuted,
                border: `2px solid ${currentWeek === week ? theme.primary : theme.cardBorder}`,
              }}
            >
              W{week}
            </button>
          ))}
        </div>

      {/* 요일 선택 (모바일 가로) */}
      <div 
        className="rounded-xl md:rounded-2xl p-2.5 md:p-3 shadow-md md:shadow-lg border mb-4"
        style={{ 
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
          {DAYS_OF_WEEK.map((day, index) => {
            const dayData = currentPlan?.days.find(d => d.dayOfWeek === index);
            const isSelected = selectedDay === index;
            const hasExercises = (dayData?.exercises.length ?? 0) > 0;
            
            return (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className="py-2 rounded-lg text-xs md:text-sm font-bold transition-all relative flex flex-col items-center justify-center"
                style={{
                  backgroundColor: isSelected ? theme.primary : theme.accent,
                  color: isSelected ? theme.bg : theme.text,
                }}
              >
                <span className="text-[10px] md:text-xs">{day}</span>
                {hasExercises && !isSelected && (
                  <div 
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

        {/* 운동 루틴 영역 - 데스크탑: 2열 (요일 | 운동) / 모바일: 1열 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* 왼쪽: 요일 목록 (데스크탑만 표시) */}
          <div className="hidden lg:block lg:col-span-3">
            <div 
              className="rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-xl md:shadow-2xl border sticky top-24"
              style={{ 
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              }}
            >
              <h3 className="text-xs md:text-sm font-bold mb-2 md:mb-3 px-1 md:px-2" style={{ color: theme.textSecondary }}>
                요일 선택
              </h3>
              <div className="space-y-1.5 md:space-y-2">
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayData = currentPlan?.days.find(d => d.dayOfWeek === index);
                  const isSelected = selectedDay === index;
                  const hasExercises = (dayData?.exercises.length ?? 0) > 0;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(index)}
                      className="w-full py-2.5 md:py-3 rounded-xl md:rounded-xl font-bold transition-all flex items-center justify-between px-3 md:px-4"
                      style={{
                        backgroundColor: isSelected ? theme.primary : theme.accent,
                        color: isSelected ? theme.bg : theme.text,
                      }}
                    >
                      <span className="text-xs md:text-sm">{day}요일</span>
                      {hasExercises && (
                        <span className="text-[10px] md:text-xs font-semibold" style={{ 
                          color: isSelected ? theme.bg : theme.textMuted 
                        }}>
                          {dayData.exercises.length}개
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 오른쪽: 운동 루틴 */}
          <div className="lg:col-span-9">
            {selectedDayData ? (
              <div className="space-y-3 md:space-y-4">
                {/* 제목 */}
                <div 
                  className="rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl md:shadow-2xl border"
                  style={{ 
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <div className="flex items-start justify-between mb-1 md:mb-2">
                    <h2 className="text-xl md:text-3xl font-black flex-1" style={{ color: theme.text }}>
                      {getRoutineName()}
                    </h2>
                    <button
                      onClick={handleEditRoutineName}
                      className="p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all"
                      style={{
                        backgroundColor: theme.accent,
                        color: theme.textSecondary,
                      }}
                    >
                      <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                  <p className="text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                    {currentWeek}주차 · {selectedDayData.exercises.length}개 운동 · {totalSets}세트
                  </p>
                </div>

                {/* 운동 목록 - 데스크탑 1열 / 모바일 1열 */}
                <div className="space-y-3 md:space-y-4">
                  {selectedDayData.exercises.map((exercise, idx) => {
                    const completedCount = exercise.sets.filter(s => s.completed).length;
                    const allCompleted = exercise.sets.every(s => s.completed);
                    const isExpanded = expandedExercise === exercise.id;
                    
                    return (
                      <motion.div
                        key={exercise.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl overflow-hidden border"
                        style={{ 
                          backgroundColor: theme.card,
                          borderColor: theme.cardBorder,
                        }}
                      >
                        <motion.div 
                          className="p-3 md:p-5 flex items-center justify-between"
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center gap-3 md:gap-4 flex-1">
                            {/* 전체 세트 선택 체크박스 */}
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAllSets(exercise.id);
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all font-black text-xl md:text-2xl shadow-md md:shadow-lg"
                              style={{
                                backgroundColor: allCompleted ? theme.primary : theme.accent,
                                color: allCompleted ? theme.bg : theme.textMuted,
                              }}
                            >
                              {allCompleted ? '✓' : '○'}
                            </motion.button>
                            <div className="text-left flex-1">
                              <h3 className="font-black text-sm md:text-lg" style={{ color: theme.text }}>{exercise.name}</h3>
                              <p className="text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                                {completedCount}/{exercise.sets.length} 세트 완료
                              </p>
                            </div>
                          </div>
                          <motion.button 
                            onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                            className="p-1.5 md:p-2"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 md:w-6 md:h-6" style={{ color: theme.textMuted }} />
                            ) : (
                              <ChevronDown className="w-5 h-5 md:w-6 md:h-6" style={{ color: theme.textMuted }} />
                            )}
                          </motion.button>
                        </motion.div>

                        {/* 세트 상세 */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="px-3 md:px-5 pb-3 md:pb-5 space-y-2 md:space-y-3" 
                              style={{ backgroundColor: theme.accent }}
                            >
                              <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-black mb-1 md:mb-2" style={{ color: theme.textMuted }}>
                                <span className="w-8 md:w-12 text-center">세트</span>
                                <span className="flex-1 text-center">중량(kg)</span>
                                <span className="flex-1 text-center">횟수</span>
                                <span className="w-8 md:w-12"></span>
                              </div>
                              
                              {exercise.sets.map((set, idx) => (
                                <motion.div 
                                  key={set.id} 
                                  className="flex items-center gap-1 md:gap-2"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                >
                                  <span className="w-8 md:w-12 text-center text-xs md:text-sm font-black" style={{ color: theme.textSecondary }}>
                                    #{idx + 1}
                                  </span>
                                  <input
                                    type="number"
                                    value={set.weight || ''}
                                    onChange={(e) => handleUpdateSet(exercise.id, set.id, 'weight', Number(e.target.value))}
                                    className="flex-1 px-2 md:px-3 py-2 md:py-3 rounded-lg md:rounded-xl text-center border-0 font-bold transition-all focus:ring-2 text-sm"
                                    style={{ 
                                      backgroundColor: theme.card,
                                      color: theme.text,
                                    }}
                                    placeholder="0"
                                  />
                                  <input
                                    type="number"
                                    value={set.reps || ''}
                                    onChange={(e) => handleUpdateSet(exercise.id, set.id, 'reps', Number(e.target.value))}
                                    className="flex-1 px-2 md:px-3 py-2 md:py-3 rounded-lg md:rounded-xl text-center border-0 font-bold transition-all focus:ring-2 text-sm"
                                    style={{ 
                                      backgroundColor: theme.card,
                                      color: theme.text,
                                    }}
                                    placeholder="0"
                                  />
                                  <motion.button
                                    onClick={() => handleToggleSetComplete(exercise.id, set.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-all font-black text-base md:text-lg shadow-md md:shadow-lg"
                                    style={{
                                      backgroundColor: set.completed ? theme.primary : theme.card,
                                      color: set.completed ? theme.bg : theme.textMuted,
                                    }}
                                  >
                                    ✓
                                  </motion.button>
                                </motion.div>
                              ))}

                              <motion.button
                                onClick={() => handleAddSet(exercise.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-2 md:py-3 mt-1 md:mt-2 text-xs md:text-sm rounded-lg md:rounded-xl transition-all font-bold"
                                style={{ 
                                  backgroundColor: theme.card,
                                  color: theme.textSecondary 
                                }}
                              >
                                + 세트 추가
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {/* 운동 추가 버튼 */}
                <motion.button
                  onClick={() => setShowAddExercise(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 md:py-5 rounded-2xl md:rounded-3xl font-black border-2 border-dashed transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-lg shadow-xl md:shadow-2xl"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                    color: theme.textSecondary,
                  }}
                >
                  <Plus className="w-5 h-5 md:w-6 md:h-6" />
                  새 운동 추가
                </motion.button>

                {/* 하단 액션 버튼 */}
                {selectedDayData.exercises.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 md:gap-4 pt-1 md:pt-2">
                    <button
                      onClick={() => setShowRecordMode(true)}
                      className="py-4 md:py-5 rounded-2xl md:rounded-3xl font-black border-2 transition-all shadow-xl md:shadow-2xl"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                        color: theme.textSecondary,
                      }}
                    >
                      📊 기록하기
                    </button>
                    <button
                      onClick={() => toast.message('운동 시작!')}
                      className="py-4 md:py-5 rounded-2xl md:rounded-3xl font-black shadow-xl md:shadow-2xl flex items-center justify-center gap-2 text-sm md:text-lg"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.bg,
                      }}
                    >
                      <Zap className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
                      운동 시작
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="rounded-2xl md:rounded-3xl p-6 md:p-12 text-center shadow-xl md:shadow-2xl border"
                style={{ 
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                }}
              >
                <div className="text-4xl md:text-6xl mb-3 md:mb-4">💪</div>
                <p className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>운동을 추가하세요</p>
                <p className="text-xs md:text-sm font-semibold mt-1 md:mt-2" style={{ color: theme.textMuted }}>
                  아직 {DAYS_OF_WEEK[selectedDay]}요일 루틴이 없습니다
                </p>
                <button
                  onClick={() => setShowAddExercise(true)}
                  className="mt-4 md:mt-6 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold md:font-black shadow-md md:shadow-lg text-sm md:text-base"
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.bg,
                  }}
                >
                  운동 추가하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 운동 추가 모달 */}
      <AnimatePresence>
        {showAddExercise && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setShowAddExercise(false)}
            />
            <div 
              className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
              onClick={() => setShowAddExercise(false)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="rounded-t-2xl md:rounded-3xl p-4 md:p-6 md:max-w-md md:w-full shadow-2xl"
                style={{ backgroundColor: theme.card }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>운동 추가</h3>
                  <motion.button 
                    onClick={() => setShowAddExercise(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6 md:w-7 md:h-7" style={{ color: theme.textMuted }} />
                  </motion.button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  handleAddExercise(name);
                }}>
                  <input
                    name="name"
                    type="text"
                    placeholder="운동 이름 입력 (예: 벤치프레스)"
                    className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border-0 mb-3 md:mb-4 font-semibold text-sm md:text-base"
                    style={{ 
                      backgroundColor: theme.accent,
                      color: theme.text,
                    }}
                    autoFocus
                  />
                  
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-lg shadow-xl"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.bg,
                    }}
                  >
                    추가하기
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* 기록하기 모달 */}
      <AnimatePresence>
        {showRecordMode && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setShowRecordMode(false)}
            />
            <div 
              className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
              onClick={() => setShowRecordMode(false)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="rounded-t-2xl md:rounded-3xl p-4 md:p-6 md:max-w-md md:w-full shadow-2xl"
                style={{ backgroundColor: theme.card }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg md:text-2xl font-black mb-1 md:mb-2" style={{ color: theme.text }}>
                  운동 완료! 🎉
                </h3>
                <p className="mb-4 md:mb-6 text-sm md:font-semibold" style={{ color: theme.textSecondary }}>
                  오늘 운동을 기록에 저장하시겠습니까?
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => setShowRecordMode(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3 md:py-4 rounded-xl md:rounded-2xl font-bold md:font-black text-sm md:text-base"
                    style={{ 
                      backgroundColor: theme.accent,
                      color: theme.textSecondary 
                    }}
                  >
                    취소
                  </motion.button>
                  <motion.button
                    onClick={handleSaveRecord}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3 md:py-4 rounded-xl md:rounded-2xl font-bold md:font-black shadow-xl text-sm md:text-base"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.bg,
                    }}
                  >
                    저장하기
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* 루틴 이름 편집 모달 */}
      <AnimatePresence>
        {showEditRoutineName && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setShowEditRoutineName(false)}
            />
            <div 
              className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
              onClick={() => setShowEditRoutineName(false)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="rounded-t-2xl md:rounded-3xl p-4 md:p-6 md:max-w-md md:w-full shadow-2xl"
                style={{ backgroundColor: theme.card }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>루틴 이름 편집</h3>
                  <motion.button 
                    onClick={() => setShowEditRoutineName(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6 md:w-7 md:h-7" style={{ color: theme.textMuted }} />
                  </motion.button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveRoutineName();
                }}>
                  <input
                    type="text"
                    value={editingRoutineName}
                    onChange={(e) => setEditingRoutineName(e.target.value)}
                    placeholder={`${DAYS_OF_WEEK[selectedDay]}요일 루틴`}
                    className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border-0 mb-2 font-semibold text-sm md:text-base"
                    style={{ 
                      backgroundColor: theme.accent,
                      color: theme.text,
                    }}
                    autoFocus
                  />
                  <p className="text-[10px] md:text-xs font-semibold mb-3 md:mb-4 px-1" style={{ color: theme.textMuted }}>
                    예: 가슴 데이, 등 운동, 하체 킬러 등
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setShowEditRoutineName(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-3 md:py-4 rounded-xl md:rounded-2xl font-bold md:font-black text-sm md:text-base"
                      style={{ 
                        backgroundColor: theme.accent,
                        color: theme.textSecondary 
                      }}
                    >
                      취소
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-3 md:py-4 rounded-xl md:rounded-2xl font-bold md:font-black shadow-xl text-sm md:text-base"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.bg,
                      }}
                    >
                      저장
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
