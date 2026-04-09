import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useHealth } from '../../../context/HealthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Dumbbell, ChevronRight, Play, Calendar, TrendingUp, Flame } from 'lucide-react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface HomeTabProps {
  theme: any;
  onStartWorkout?: () => void;
}

export function HomeTab({ theme, onStartWorkout }: HomeTabProps) {
  const {
    weekPlans,
    currentWeek,
    setCurrentWeek,
    workoutRecords,
    getLatestBodyRecord,
    getCurrentStreak,
    getTotalWorkoutCount,
  } = useHealth();

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayStr = format(today, 'yyyy-MM-dd');

  const currentWeekPlan = weekPlans.find(p => p.weekNumber === currentWeek);
  const todayRoutine = currentWeekPlan?.days.find(d => d.dayOfWeek === todayDayOfWeek);
  const hasTodayWorkout = todayRoutine && !todayRoutine.isRestDay && todayRoutine.exercises.length > 0;
  const alreadyWorkoutedToday = workoutRecords.some(r => r.date === todayStr);

  const streak = getCurrentStreak();
  const totalWorkouts = getTotalWorkoutCount();
  const latestBody = getLatestBodyRecord();

  // 이번 주 운동 현황
  const thisWeekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasRecord = workoutRecords.some(r => r.date === dateStr);
      const routine = currentWeekPlan?.days.find(d => d.dayOfWeek === i);
      const hasPlannedWorkout = routine && !routine.isRestDay && routine.exercises.length > 0;
      return { date, dateStr, dayLabel: DAY_LABELS[i], hasRecord, hasPlannedWorkout, isToday: i === todayDayOfWeek };
    });
  }, [workoutRecords, currentWeekPlan, todayDayOfWeek]);

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
            {format(today, 'EEEE', { locale: ko })}
          </p>
          <h1 className="text-3xl md:text-4xl font-black leading-none" style={{ color: theme.text }}>
            {format(today, 'M월 d일')}
          </h1>
        </div>

        {/* 주차 선택 */}
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(week => (
            <button
              key={week}
              onClick={() => setCurrentWeek(week)}
              className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: currentWeek === week ? theme.navActiveBackground : theme.navBackground,
                color: currentWeek === week ? theme.navActiveText : theme.navIdleText,
              }}
            >
              {week}주
            </button>
          ))}
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '연속', value: streak, unit: '일', icon: Flame, color: theme.primary },
          { label: '총 운동', value: totalWorkouts, unit: '회', icon: Calendar, color: theme.secondary || theme.primary },
          { label: '체중', value: latestBody?.weight?.toFixed(1) || '-', unit: 'kg', icon: TrendingUp, color: theme.accent1 || theme.primary },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border p-3 md:p-4"
              style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
            >
              <div
                className="h-7 w-7 rounded-xl flex items-center justify-center mb-2"
                style={{ background: `${stat.color}20` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
              </div>
              <div>
                <span className="text-xl font-black" style={{ color: theme.text }}>{stat.value}</span>
                <span className="text-xs ml-0.5" style={{ color: theme.textMuted }}>{stat.unit}</span>
              </div>
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: theme.textMuted }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* 오늘 운동 카드 */}
      {hasTodayWorkout ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-4 md:p-5"
          style={{
            background: alreadyWorkoutedToday
              ? `${theme.primary}10`
              : `linear-gradient(135deg, ${theme.primary}15, ${theme.accent1 || theme.primary}08)`,
            borderColor: `${theme.primary}30`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="h-4 w-4" style={{ color: theme.primary }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.primary }}>
                  오늘의 운동
                </span>
                {alreadyWorkoutedToday && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${theme.primary}20`, color: theme.primary }}
                  >
                    완료 ✓
                  </span>
                )}
              </div>
              {todayRoutine?.routineName && (
                <h3 className="text-lg font-black mb-2" style={{ color: theme.text }}>
                  {todayRoutine.routineName}
                </h3>
              )}
              <div className="space-y-1">
                {todayRoutine?.exercises.slice(0, 4).map((ex, idx) => (
                  <div key={ex.id} className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                      {idx + 1}.
                    </span>
                    <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>
                      {ex.name}
                    </span>
                    <span className="text-xs" style={{ color: theme.textMuted }}>
                      {ex.sets.filter(s => !s.isWarmup).length}세트
                    </span>
                  </div>
                ))}
                {(todayRoutine?.exercises.length ?? 0) > 4 && (
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    +{(todayRoutine?.exercises.length ?? 0) - 4}개 더
                  </p>
                )}
              </div>
            </div>

            {!alreadyWorkoutedToday && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onStartWorkout}
                className="flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.secondary || theme.primary})`,
                  boxShadow: `0 8px 24px ${theme.primary}40`,
                }}
              >
                <Play className="h-4 w-4 fill-white" />
                시작
              </motion.button>
            )}
          </div>
        </motion.div>
      ) : (
        <div
          className="rounded-2xl border p-4 text-center"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <p className="text-sm font-medium" style={{ color: theme.textMuted }}>
            오늘은 휴식일이에요 😴
          </p>
        </div>
      )}

      {/* 이번 주 달력 */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: theme.text }}>
          이번 주 ({currentWeek}주차)
        </h2>
        <div className="grid grid-cols-7 gap-1.5">
          {thisWeekDays.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium" style={{ color: theme.textMuted }}>
                {day.dayLabel}
              </span>
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold relative"
                style={{
                  background: day.hasRecord
                    ? `${theme.primary}25`
                    : day.isToday
                    ? `${theme.primary}10`
                    : 'transparent',
                  border: day.isToday ? `2px solid ${theme.primary}` : `1px solid ${theme.line}`,
                  color: day.hasRecord ? theme.primary : day.isToday ? theme.primary : theme.textSecondary,
                }}
              >
                {format(day.date, 'd')}
                {day.hasRecord && (
                  <div
                    className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                    style={{ background: theme.primary }}
                  />
                )}
              </div>
              {day.hasPlannedWorkout && (
                <div className="h-1 w-1 rounded-full" style={{ background: theme.textMuted }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 주간 운동 계획 */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: theme.text }}>
          {currentWeek}주차 루틴
        </h2>
        {currentWeekPlan ? (
          <div className="space-y-2">
            {currentWeekPlan.days.filter(d => !d.isRestDay && d.exercises.length > 0).map(day => (
              <div
                key={day.dayOfWeek}
                className="flex items-center gap-3 rounded-xl p-2.5"
                style={{
                  background: day.dayOfWeek === todayDayOfWeek ? `${theme.primary}10` : theme.hoverBackground || 'transparent',
                }}
              >
                <span
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: day.dayOfWeek === todayDayOfWeek ? theme.primary : `${theme.primary}15`,
                    color: day.dayOfWeek === todayDayOfWeek ? '#fff' : theme.primary,
                  }}
                >
                  {DAY_LABELS[day.dayOfWeek]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                    {day.routineName || day.exercises.map(e => e.name).join(', ')}
                  </p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {day.exercises.length}가지 운동
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: theme.textMuted }}>
            루틴 데이터가 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
