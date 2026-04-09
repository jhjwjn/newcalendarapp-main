import React, { useMemo, useState } from 'react';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  FileText,
  BookOpen,
  Zap,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';

interface HomeTabProps {
  onNavigate: (tab: 'calendar' | 'notes' | 'study' | 'habits') => void;
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  const {
    events,
    categories,
    notes,
    settings,
    todayBriefing,
    refreshBriefing,
    habits,
    habitRecords,
    toggleHabitRecord,
    studySessions,
  } = usePlanner();
  const theme = getPlannerTheme(settings);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const handleRefreshBriefing = async () => {
    setIsRefreshing(true);
    await refreshBriefing();
    setIsRefreshing(false);
  };

  // 오늘 + 내일 일정 (최대 5개)
  const upcomingEvents = useMemo(() => {
    const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd');
    return events
      .filter(e => e.date === todayStr || e.date === tomorrow)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 6);
  }, [events, todayStr]);

  // 오늘의 습관
  const todayHabits = useMemo(() => {
    const todayDayOfWeek = today.getDay();
    return habits.filter(h =>
      h.targetDays.length === 0 || h.targetDays.includes(todayDayOfWeek)
    );
  }, [habits, today]);

  const completedHabitIds = useMemo(
    () => new Set(habitRecords.filter(r => r.date === todayStr).map(r => r.habitId)),
    [habitRecords, todayStr]
  );

  const completedHabitsCount = todayHabits.filter(h => completedHabitIds.has(h.id)).length;

  // 학습 통계
  const currentStreak = studySessions[studySessions.length - 1]?.streak || 0;
  const todayStudied = studySessions.find(s => s.date === todayStr)?.cardsStudied || 0;

  // 최근 메모
  const recentNote = [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];

  const getCategoryColor = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.color || '#6b7280';
  const getCategoryEmoji = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.emoji || '📌';

  const getEventDateLabel = (date: string) => {
    if (date === todayStr) return '오늘';
    if (date === format(addDays(today, 1), 'yyyy-MM-dd')) return '내일';
    return format(new Date(date), 'M/d', { locale: ko });
  };

  const todayCount = events.filter(e => e.date === todayStr).length;

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 날짜 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
            {format(today, 'EEEE', { locale: ko })}
          </p>
          <h1 className="text-3xl md:text-4xl font-black leading-none" style={{ color: theme.text }}>
            {format(today, 'M월 d일')}
          </h1>
          {todayCount > 0 && (
            <p className="text-sm mt-1 font-medium" style={{ color: theme.textSecondary }}>
              오늘 일정 {todayCount}개
            </p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleRefreshBriefing}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold border transition-all"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            color: theme.textMuted,
          }}
        >
          <motion.div animate={isRefreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw className="h-3.5 w-3.5" />
          </motion.div>
          AI 브리핑
        </motion.button>
      </div>

      {/* AI 브리핑 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-4 md:p-5"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}18, ${theme.accent1}10)`,
          borderColor: `${theme.primary}30`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="rounded-xl p-2 shrink-0"
            style={{ background: `${theme.primary}20` }}
          >
            <Sparkles className="h-4 w-4" style={{ color: theme.primary }} />
          </div>
          <p className="text-sm leading-relaxed flex-1" style={{ color: theme.textSecondary }}>
            {todayBriefing}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 오늘의 일정 */}
        <div
          className="rounded-2xl border p-4"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: theme.primary }} />
              <h2 className="text-sm font-bold" style={{ color: theme.text }}>다가오는 일정</h2>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="flex items-center gap-0.5 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: theme.primary }}
            >
              더보기 <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="h-8 w-8 mb-2 opacity-20" style={{ color: theme.textMuted }} />
              <p className="text-xs" style={{ color: theme.textMuted }}>예정된 일정이 없어요</p>
              <button
                onClick={() => onNavigate('calendar')}
                className="mt-2 text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                일정 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 rounded-xl p-2.5 transition-all"
                  style={{ background: theme.hoverBackground }}
                >
                  <div
                    className="h-8 w-1 rounded-full shrink-0"
                    style={{ background: getCategoryColor(event.categoryId) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                      {getCategoryEmoji(event.categoryId)} {event.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                      {getEventDateLabel(event.date)} · {event.startTime}–{event.endTime}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 오늘의 습관 */}
        <div
          className="rounded-2xl border p-4"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: theme.accent1 || theme.primary }} />
              <h2 className="text-sm font-bold" style={{ color: theme.text }}>오늘의 습관</h2>
            </div>
            <div className="flex items-center gap-2">
              {todayHabits.length > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${theme.primary}18`,
                    color: theme.primary,
                  }}
                >
                  {completedHabitsCount}/{todayHabits.length}
                </span>
              )}
              <button
                onClick={() => onNavigate('habits')}
                className="flex items-center gap-0.5 text-xs font-semibold hover:opacity-70 transition-opacity"
                style={{ color: theme.primary }}
              >
                관리 <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {todayHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Zap className="h-8 w-8 mb-2 opacity-20" style={{ color: theme.textMuted }} />
              <p className="text-xs" style={{ color: theme.textMuted }}>습관을 추가해보세요</p>
              <button
                onClick={() => onNavigate('habits')}
                className="mt-2 text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                습관 만들기
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayHabits.slice(0, 4).map(habit => {
                const done = completedHabitIds.has(habit.id);
                return (
                  <motion.button
                    key={habit.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleHabitRecord(habit.id, todayStr)}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all"
                    style={{ background: done ? `${habit.color}12` : theme.hoverBackground }}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: habit.color }} />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 opacity-30" style={{ color: habit.color }} />
                    )}
                    <span className="text-sm">{habit.emoji}</span>
                    <span
                      className="text-sm font-medium flex-1 truncate"
                      style={{
                        color: done ? theme.textMuted : theme.text,
                        textDecoration: done ? 'line-through' : 'none',
                      }}
                    >
                      {habit.name}
                    </span>
                  </motion.button>
                );
              })}
              {todayHabits.length > 4 && (
                <p className="text-center text-xs py-1" style={{ color: theme.textMuted }}>
                  +{todayHabits.length - 4}개 더
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 학습 & 메모 요약 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 학습 현황 */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('study')}
          className="rounded-2xl border p-4 text-left transition-all hover:opacity-90"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4" style={{ color: theme.secondary }} />
            <span className="text-sm font-bold" style={{ color: theme.text }}>학습</span>
          </div>
          <div className="space-y-1">
            <div>
              <span className="text-2xl font-black" style={{ color: theme.text }}>{currentStreak}</span>
              <span className="text-xs ml-1 font-medium" style={{ color: theme.textMuted }}>일 연속</span>
            </div>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              오늘 {todayStudied}장 학습
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: theme.primary }}>
            학습 시작 <ChevronRight className="h-3 w-3" />
          </div>
        </motion.button>

        {/* 메모 */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('notes')}
          className="rounded-2xl border p-4 text-left transition-all hover:opacity-90"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" style={{ color: theme.tertiary }} />
            <span className="text-sm font-bold" style={{ color: theme.text }}>메모</span>
          </div>
          {recentNote ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                {recentNote.title || '제목 없음'}
              </p>
              <p className="text-xs leading-relaxed line-clamp-2 opacity-70" style={{ color: theme.textSecondary }}>
                {recentNote.content}
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: theme.textMuted }}>메모가 없어요</p>
          )}
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: theme.primary }}>
            메모 보기 <ChevronRight className="h-3 w-3" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
