import React, { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  FileText,
  BookOpen,
  Heart,
  Sun,
  Moon,
  ChevronRight,
  Sparkles,
  Dumbbell,
  X,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '../../../lib/toast';
import { usePlanner } from '../../../context/PlannerContext';
import { DayRoutine, WeekPlan } from '../../../types/health';
import { PLANNER_GLASS_THEMES, PLANNER_GLASS_THEMES_DARK } from '../../../styles/colorThemes';

interface HomeTabProps {
  onNavigate: (tab: 'calendar' | 'notes' | 'study') => void;
}

interface HealthScheduleRow {
  dayOfWeek: number;
  label: string;
  planned: boolean;
  selected: boolean;
  time: string;
  routineName: string;
  summary: string;
  plans: Array<{
    weekNumber: number;
    weekOffset: number;
    routineName: string;
    summary: string;
  }>;
}

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const getGlassTheme = (accent: 'blue' | 'purple' | 'peach' | 'black', isDark = false) => {
  const colors = isDark ? PLANNER_GLASS_THEMES_DARK[accent] : PLANNER_GLASS_THEMES[accent];

  if (isDark) {
    const themes = {
      blue: {
        bg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        primary: colors.primary,
        secondary: colors.secondary,
        tertiary: colors.tertiary,
        accent1: colors.accent1,
        accent2: colors.accent2,
        bgBlur1: `radial-gradient(circle, ${colors.primary}30, transparent)`,
        bgBlur2: `radial-gradient(circle, ${colors.accent1}30, transparent)`,
        bgBlur3: `radial-gradient(circle, ${colors.tertiary}30, transparent)`,
        cardPrimary: `linear-gradient(135deg, ${colors.primary}20, rgba(30, 41, 59, 0.8))`,
        cardSecondary: `linear-gradient(135deg, ${colors.secondary}20, rgba(30, 41, 59, 0.8))`,
        cardTertiary: `linear-gradient(135deg, ${colors.tertiary}20, rgba(30, 41, 59, 0.8))`,
        text: '#F8FAFC',
        textSecondary: colors.primary,
        textMuted: '#94A3B8',
        iconBg: `${colors.primary}40`,
      },
      purple: {
        bg: 'linear-gradient(135deg, #1E1B2E 0%, #2D1B3D 50%, #1E1B2E 100%)',
        primary: colors.primary,
        secondary: colors.secondary,
        tertiary: colors.tertiary,
        accent1: colors.accent1,
        accent2: colors.accent2,
        bgBlur1: `radial-gradient(circle, ${colors.primary}30, transparent)`,
        bgBlur2: `radial-gradient(circle, ${colors.secondary}30, transparent)`,
        bgBlur3: `radial-gradient(circle, ${colors.accent2}30, transparent)`,
        cardPrimary: `linear-gradient(135deg, ${colors.primary}20, rgba(45, 27, 61, 0.8))`,
        cardSecondary: `linear-gradient(135deg, ${colors.secondary}20, rgba(45, 27, 61, 0.8))`,
        cardTertiary: `linear-gradient(135deg, ${colors.tertiary}20, rgba(45, 27, 61, 0.8))`,
        text: '#F8FAFC',
        textSecondary: colors.primary,
        textMuted: '#A78BFA',
        iconBg: `${colors.primary}40`,
      },
      peach: {
        bg: 'linear-gradient(135deg, #2D1B1E 0%, #3D1E2D 50%, #2D1B1E 100%)',
        primary: colors.primary,
        secondary: colors.secondary,
        tertiary: colors.tertiary,
        accent1: colors.accent1,
        accent2: colors.accent2,
        bgBlur1: `radial-gradient(circle, ${colors.primary}30, transparent)`,
        bgBlur2: `radial-gradient(circle, ${colors.tertiary}30, transparent)`,
        bgBlur3: `radial-gradient(circle, ${colors.accent1}30, transparent)`,
        cardPrimary: `linear-gradient(135deg, ${colors.primary}20, rgba(61, 30, 45, 0.8))`,
        cardSecondary: `linear-gradient(135deg, ${colors.secondary}20, rgba(61, 30, 45, 0.8))`,
        cardTertiary: `linear-gradient(135deg, ${colors.tertiary}20, rgba(61, 30, 45, 0.8))`,
        text: '#F8FAFC',
        textSecondary: colors.primary,
        textMuted: '#F8B4D0',
        iconBg: `${colors.primary}40`,
      },
      black: {
        bg: 'linear-gradient(135deg, #0F172A 0%, #111827 50%, #020617 100%)',
        primary: colors.primary,
        secondary: colors.secondary,
        tertiary: colors.tertiary,
        accent1: colors.accent1,
        accent2: colors.accent2,
        bgBlur1: `radial-gradient(circle, ${colors.primary}18, transparent)`,
        bgBlur2: `radial-gradient(circle, ${colors.secondary}18, transparent)`,
        bgBlur3: `radial-gradient(circle, ${colors.accent2}18, transparent)`,
        cardPrimary: `linear-gradient(135deg, ${colors.primary}18, rgba(15, 23, 42, 0.82))`,
        cardSecondary: `linear-gradient(135deg, ${colors.secondary}16, rgba(15, 23, 42, 0.82))`,
        cardTertiary: `linear-gradient(135deg, ${colors.tertiary}14, rgba(15, 23, 42, 0.82))`,
        text: '#F8FAFC',
        textSecondary: colors.primary,
        textMuted: '#94A3B8',
        iconBg: `${colors.primary}24`,
      },
    };

    return themes[accent];
  }

  const themes = {
    blue: {
      bg: 'linear-gradient(135deg, #E6F0FF 0%, #F0F8FF 50%, #FFE8F0 100%)',
      primary: colors.primary,
      secondary: colors.secondary,
      tertiary: colors.tertiary,
      accent1: colors.accent1,
      accent2: colors.accent2,
      bgBlur1: `radial-gradient(circle, ${colors.primary}40, transparent)`,
      bgBlur2: `radial-gradient(circle, ${colors.accent1}40, transparent)`,
      bgBlur3: `radial-gradient(circle, ${colors.tertiary}40, transparent)`,
      cardPrimary: `linear-gradient(135deg, ${colors.primary}30, rgba(255, 255, 255, 0.7))`,
      cardSecondary: `linear-gradient(135deg, ${colors.secondary}30, rgba(255, 255, 255, 0.7))`,
      cardTertiary: `linear-gradient(135deg, ${colors.tertiary}30, rgba(255, 255, 255, 0.7))`,
      text: '#1E293B',
      textSecondary: colors.primary,
      textMuted: '#64748B',
      iconBg: `${colors.primary}33`,
    },
    purple: {
      bg: 'linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 50%, #FFE8F0 100%)',
      primary: colors.primary,
      secondary: colors.secondary,
      tertiary: colors.tertiary,
      accent1: colors.accent1,
      accent2: colors.accent2,
      bgBlur1: `radial-gradient(circle, ${colors.primary}40, transparent)`,
      bgBlur2: `radial-gradient(circle, ${colors.secondary}40, transparent)`,
      bgBlur3: `radial-gradient(circle, ${colors.accent2}40, transparent)`,
      cardPrimary: `linear-gradient(135deg, ${colors.primary}30, rgba(255, 255, 255, 0.7))`,
      cardSecondary: `linear-gradient(135deg, ${colors.secondary}30, rgba(255, 255, 255, 0.7))`,
      cardTertiary: `linear-gradient(135deg, ${colors.tertiary}30, rgba(255, 255, 255, 0.7))`,
      text: '#1E293B',
      textSecondary: colors.primary,
      textMuted: '#64748B',
      iconBg: `${colors.primary}33`,
    },
    peach: {
      bg: 'linear-gradient(135deg, #FFF0E8 0%, #FFF8F0 50%, #F8E8FF 100%)',
      primary: colors.primary,
      secondary: colors.secondary,
      tertiary: colors.tertiary,
      accent1: colors.accent1,
      accent2: colors.accent2,
      bgBlur1: `radial-gradient(circle, ${colors.primary}40, transparent)`,
      bgBlur2: `radial-gradient(circle, ${colors.tertiary}40, transparent)`,
      bgBlur3: `radial-gradient(circle, ${colors.accent1}40, transparent)`,
      cardPrimary: `linear-gradient(135deg, ${colors.primary}30, rgba(255, 255, 255, 0.7))`,
      cardSecondary: `linear-gradient(135deg, ${colors.secondary}30, rgba(255, 255, 255, 0.7))`,
      cardTertiary: `linear-gradient(135deg, ${colors.tertiary}30, rgba(255, 255, 255, 0.7))`,
      text: '#1E293B',
      textSecondary: colors.primary,
      textMuted: '#64748B',
      iconBg: `${colors.primary}33`,
    },
    black: {
      bg: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)',
      primary: colors.primary,
      secondary: colors.secondary,
      tertiary: colors.tertiary,
      accent1: colors.accent1,
      accent2: colors.accent2,
      bgBlur1: `radial-gradient(circle, ${colors.primary}18, transparent)`,
      bgBlur2: `radial-gradient(circle, ${colors.secondary}18, transparent)`,
      bgBlur3: `radial-gradient(circle, ${colors.accent2}18, transparent)`,
      cardPrimary: `linear-gradient(135deg, ${colors.primary}14, rgba(255, 255, 255, 0.82))`,
      cardSecondary: `linear-gradient(135deg, ${colors.secondary}12, rgba(255, 255, 255, 0.84))`,
      cardTertiary: `linear-gradient(135deg, ${colors.tertiary}10, rgba(255, 255, 255, 0.86))`,
      text: '#111827',
      textSecondary: colors.primary,
      textMuted: '#475569',
      iconBg: `${colors.primary}18`,
    },
  };

  return themes[accent];
};

function getNextDateForDay(targetDay: number) {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = (targetDay - currentDay + 7) % 7;
  return format(addDays(today, diff), 'yyyy-MM-dd');
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

function getHealthScheduleRows(): HealthScheduleRow[] {
  try {
    const storedPlans = localStorage.getItem('health_week_plans');
    const storedCurrentWeek = Number(localStorage.getItem('health_current_week') || '1');
    const storedTimes = JSON.parse(localStorage.getItem('planner_health_schedule_times') || '{}') as Record<string, string>;
    const weekPlans: WeekPlan[] = storedPlans ? JSON.parse(storedPlans) : [];
    const orderedPlans = [...weekPlans].sort((a, b) => {
      const aOffset = (a.weekNumber - storedCurrentWeek + 4) % 4;
      const bOffset = (b.weekNumber - storedCurrentWeek + 4) % 4;
      return aOffset - bOffset;
    });

    return DAYS_OF_WEEK.map((label, dayOfWeek) => {
      const plans = orderedPlans.flatMap((plan, index) => {
        const routine = plan.days.find(day => day.dayOfWeek === dayOfWeek);
        if (!routine || routine.isRestDay || routine.exercises.length === 0) return [];
        return [{
          weekNumber: plan.weekNumber,
          weekOffset: index,
          routineName: routine.routineName || `${label}요일 운동`,
          summary: routine.exercises.slice(0, 3).map(exercise => exercise.name).join(', '),
        }];
      });
      const planned = plans.length > 0;
      const summary = planned
        ? plans.map(plan => `${plan.weekNumber}주차 ${plan.summary}`).slice(0, 2).join(' · ')
        : '아직 운동 루틴이 없습니다.';

      return {
        dayOfWeek,
        label,
        planned,
        selected: planned,
        time: storedTimes[String(dayOfWeek)] || '19:00',
        routineName: plans[0]?.routineName || `${label}요일 운동`,
        summary,
        plans,
      };
    });
  } catch {
    return DAYS_OF_WEEK.map((label, dayOfWeek) => ({
      dayOfWeek,
      label,
      planned: false,
      selected: false,
      time: '19:00',
      routineName: `${label}요일 운동`,
      summary: '아직 운동 루틴이 없습니다.',
      plans: [],
    }));
  }
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  const { events, notes, studySessions, settings, todayBriefing, addEvent, categories } = usePlanner();
  const [showHealthScheduler, setShowHealthScheduler] = useState(false);
  const [healthScheduleRows, setHealthScheduleRows] = useState<HealthScheduleRow[]>(() => getHealthScheduleRows());

  const theme = useMemo(() => {
    const accent = settings.isDarkMode ? settings.glassAccentDark || 'blue' : settings.glassAccent || 'blue';
    return getGlassTheme(accent, settings.isDarkMode || false);
  }, [settings.glassAccent, settings.glassAccentDark, settings.isDarkMode]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayEvents = events.filter(e => e.date === todayStr);
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const GreetingIcon = currentHour < 18 ? Sun : Moon;
  const aiOneLiner = todayBriefing?.split(/[.!?]\s/)[0] || '오늘도 작은 루틴 하나가 하루의 결을 바꿉니다.';
  const nameSuffix = settings.name ? `, ${settings.name}` : '';
  const cardBackground = settings.isDarkMode
    ? `linear-gradient(135deg, ${theme.primary}25, ${theme.secondary}20)`
    : `linear-gradient(135deg, ${theme.primary}20, rgba(255, 255, 255, 0.9))`;
  const cardBorderColor = settings.isDarkMode ? `${theme.primary}40` : 'rgba(255, 255, 255, 0.4)';
  const cardBoxShadow = settings.isDarkMode ? `0 8px 32px ${theme.primary}30` : '0 8px 32px rgba(0, 0, 0, 0.08)';

  const refreshHealthSchedule = () => {
    setHealthScheduleRows(getHealthScheduleRows());
  };

  const updateHealthRow = (dayOfWeek: number, updates: Partial<HealthScheduleRow>) => {
    setHealthScheduleRows(current =>
      current.map(row => (row.dayOfWeek === dayOfWeek ? { ...row, ...updates } : row)),
    );
  };

  const handleRegisterHealthEvents = async () => {
    const selectedRows = healthScheduleRows.filter(row => row.selected);
    if (selectedRows.length === 0) {
      toast.error('등록할 요일을 하나 이상 선택해주세요.');
      return;
    }

    const workoutCategoryId = categories.find(category => category.name === '운동')?.id || categories[0]?.id || '';
    const timeMap = Object.fromEntries(healthScheduleRows.map(row => [String(row.dayOfWeek), row.time]));
    localStorage.setItem('planner_health_schedule_times', JSON.stringify(timeMap));

    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

    for (const row of selectedRows) {
      const plansToRegister = row.plans.length > 0 ? row.plans : [{
        weekNumber: 1,
        weekOffset: 0,
        routineName: row.routineName,
        summary: row.summary,
      }];

      for (const plan of plansToRegister) {
        const targetDate = addDays(currentWeekStart, plan.weekOffset * 7 + row.dayOfWeek);
        await addEvent({
          title: plan.routineName,
          date: format(targetDate, 'yyyy-MM-dd'),
          startTime: row.time,
          endTime: addMinutesToTime(row.time, 90),
          categoryId: workoutCategoryId,
          memo: row.planned ? `헬스 루틴 연동 · ${plan.weekNumber}주차 · ${plan.summary}` : '헬스 일정 등록',
        });
      }
    }

    const totalRegistered = selectedRows.reduce((sum, row) => sum + Math.max(1, row.plans.length), 0);
    toast.success(`${totalRegistered}개의 운동 일정이 캘린더에 등록되었습니다.`);
    setShowHealthScheduler(false);
  };

  return (
    <div className="relative min-h-full overflow-hidden rounded-[28px]" style={{ background: theme.bg }}>
      <div className="absolute left-10 top-6 h-96 w-96 rounded-full opacity-30 blur-3xl" style={{ background: theme.bgBlur1 }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-30 blur-3xl" style={{ background: theme.bgBlur2 }} />
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl" style={{ background: theme.bgBlur3 }} />

      <div className="relative mx-auto max-w-[1180px] px-2 pb-3 pt-2 md:px-5 md:pt-4">
        <div className="mb-3 md:mb-5 grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div
            className="rounded-2xl md:rounded-[28px] border px-3 md:px-5 py-3 md:py-5"
            style={{
              background: settings.isDarkMode
                ? `linear-gradient(135deg, ${theme.accent1}20, ${theme.primary}16)`
                : `linear-gradient(135deg, rgba(255, 255, 255, 0.92), ${theme.accent1}18)`,
              backdropFilter: 'blur(20px)',
              borderColor: settings.isDarkMode ? `${theme.accent1}36` : 'rgba(255,255,255,0.5)',
              boxShadow: settings.isDarkMode ? `0 10px 32px ${theme.accent1}24` : `0 10px 32px ${theme.accent1}18`,
            }}
          >
            <div className="mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" style={{ color: theme.accent1 }} />
              <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                Today&apos;s Note
              </span>
            </div>
            <p className="text-sm md:text-base font-medium leading-5 md:leading-8" style={{ color: theme.text }}>
              {aiOneLiner}
            </p>
          </div>

          <div
            className="rounded-2xl md:rounded-[28px] border px-3 md:px-5 py-3 md:py-5"
            style={{
              background: cardBackground,
              backdropFilter: 'blur(20px)',
              borderColor: cardBorderColor,
              boxShadow: cardBoxShadow,
            }}
          >
            <div className="mb-1.5 md:mb-2 flex items-center gap-2 md:gap-3">
              <GreetingIcon className="h-4 w-4 md:h-5 md:w-5" style={{ color: theme.primary }} />
              <h1 className="text-lg md:text-2xl md:text-[30px] font-medium" style={{ color: theme.text }}>
                {greeting}{nameSuffix}
              </h1>
            </div>
            <p className="text-xs md:text-sm" style={{ color: settings.isDarkMode ? theme.secondary : theme.textMuted }}>
              {format(today, 'MMMM d, yyyy · EEEE', { locale: ko })}
            </p>
          </div>

          <div
            className="rounded-[28px] border px-5 py-5"
            style={{
              background: cardBackground,
              backdropFilter: 'blur(20px)',
              borderColor: cardBorderColor,
              boxShadow: cardBoxShadow,
            }}
          >
            <div className="mb-2 flex items-center gap-3">
              <GreetingIcon className="h-5 w-5" style={{ color: theme.primary }} />
              <h1 className="text-2xl font-medium md:text-[30px]" style={{ color: theme.text }}>
                {greeting}{nameSuffix}
              </h1>
            </div>
            <p className="text-sm" style={{ color: settings.isDarkMode ? theme.secondary : theme.textMuted }}>
              {format(today, 'MMMM d, yyyy · EEEE', { locale: ko })}
            </p>
          </div>
        </div>

        <div className="mb-3 md:mb-5 grid grid-cols-4 gap-2 md:gap-3 xl:grid-cols-4">
          <button
            onClick={() => onNavigate('calendar')}
            className="group flex flex-col rounded-2xl md:rounded-3xl border p-2.5 md:p-4 text-left transition-all hover:scale-[1.02] md:hover:scale-[1.03]"
            style={{
              background: settings.isDarkMode ? `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}15)` : theme.cardPrimary,
              backdropFilter: 'blur(20px)',
              borderColor: settings.isDarkMode ? `${theme.primary}50` : 'rgba(255, 255, 255, 0.4)',
              boxShadow: `0 4px 16px ${theme.primary}20`,
            }}
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-3">
              <div className="rounded-lg md:rounded-2xl p-1.5 md:p-2.5" style={{ background: settings.isDarkMode ? `${theme.primary}50` : theme.iconBg }}>
                <Calendar className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: theme.primary }} />
              </div>
              <span className="text-[10px] md:text-sm font-medium" style={{ color: theme.textMuted }}>Events</span>
            </div>
            <div className="text-xl md:text-3xl font-bold" style={{ color: theme.text }}>{todayEvents.length}</div>
            <div className="text-[9px] md:text-xs" style={{ color: theme.textMuted }}>today</div>
          </button>

          <button
            onClick={() => onNavigate('notes')}
            className="group flex flex-col rounded-2xl md:rounded-3xl border p-2.5 md:p-4 text-left transition-all hover:scale-[1.02] md:hover:scale-[1.03]"
            style={{
              background: settings.isDarkMode ? `linear-gradient(135deg, ${theme.secondary}30, ${theme.secondary}15)` : theme.cardSecondary,
              backdropFilter: 'blur(20px)',
              borderColor: settings.isDarkMode ? `${theme.secondary}50` : 'rgba(255, 255, 255, 0.4)',
              boxShadow: `0 4px 16px ${theme.secondary}20`,
            }}
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-3">
              <div className="rounded-lg md:rounded-2xl p-1.5 md:p-2.5" style={{ background: settings.isDarkMode ? `${theme.secondary}50` : theme.iconBg }}>
                <FileText className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: theme.secondary }} />
              </div>
              <span className="text-[10px] md:text-sm font-medium" style={{ color: theme.textMuted }}>Notes</span>
            </div>
            <div className="text-xl md:text-3xl font-bold" style={{ color: theme.text }}>{notes.length}</div>
            <div className="text-[9px] md:text-xs" style={{ color: theme.textMuted }}>saved</div>
          </button>

          <button
            onClick={() => onNavigate('study')}
            className="group flex flex-col rounded-2xl md:rounded-3xl border p-2.5 md:p-4 text-left transition-all hover:scale-[1.02] md:hover:scale-[1.03]"
            style={{
              background: settings.isDarkMode ? `linear-gradient(135deg, ${theme.tertiary}30, ${theme.tertiary}15)` : theme.cardTertiary,
              backdropFilter: 'blur(20px)',
              borderColor: settings.isDarkMode ? `${theme.tertiary}50` : 'rgba(255, 255, 255, 0.4)',
              boxShadow: `0 4px 16px ${theme.tertiary}20`,
            }}
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-3">
              <div className="rounded-lg md:rounded-2xl p-1.5 md:p-2.5" style={{ background: settings.isDarkMode ? `${theme.tertiary}50` : theme.iconBg }}>
                <BookOpen className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: theme.tertiary }} />
              </div>
              <span className="text-[10px] md:text-sm font-medium" style={{ color: theme.textMuted }}>Streak</span>
            </div>
            <div className="text-xl md:text-3xl font-bold" style={{ color: theme.text }}>{studySessions[studySessions.length - 1]?.streak || 0}</div>
            <div className="text-[9px] md:text-xs" style={{ color: theme.textMuted }}>days</div>
          </button>

          <button
            onClick={() => {
              refreshHealthSchedule();
              setShowHealthScheduler(true);
            }}
            className="group flex h-full flex-col rounded-3xl border p-4 text-left transition-all hover:scale-[1.03] md:p-5"
            style={{
              background: settings.isDarkMode
                ? `linear-gradient(135deg, ${theme.accent1}28, ${theme.primary}18)`
                : `linear-gradient(135deg, ${theme.accent1}24, rgba(255,255,255,0.82))`,
              backdropFilter: 'blur(20px)',
              borderColor: settings.isDarkMode ? `${theme.accent1}46` : 'rgba(255,255,255,0.4)',
              boxShadow: `0 8px 32px ${theme.accent1}22`,
            }}
          >
            <div className="mb-4 flex min-h-[52px] items-start gap-3">
              <div className="rounded-2xl p-2.5" style={{ background: settings.isDarkMode ? `${theme.accent1}42` : `${theme.accent1}26` }}>
                <Dumbbell className="h-5 w-5" style={{ color: theme.accent1 }} />
              </div>
              <span className="pt-1 text-sm font-medium leading-5" style={{ color: theme.textMuted }}>Health Schedule</span>
            </div>
            <div className="mb-1 text-lg font-bold md:text-xl" style={{ color: theme.text }}>헬스 일정 등록</div>
            <div className="text-xs leading-6" style={{ color: theme.textMuted }}>
              루틴이 있는 요일은 자동 체크되고, 시간 지정 후 캘린더에 반복 일정으로 등록됩니다.
            </div>
          </button>
        </div>

        {todayBriefing && (
          <div
            className="mb-5 rounded-3xl border p-5"
            style={{
              background: settings.isDarkMode
                ? `linear-gradient(135deg, ${theme.accent1}25, ${theme.accent2}20)`
                : `linear-gradient(135deg, ${theme.accent1}20, rgba(255, 255, 255, 0.9))`,
              backdropFilter: 'blur(20px)',
              borderColor: settings.isDarkMode ? `${theme.accent1}40` : 'rgba(255, 255, 255, 0.4)',
              boxShadow: settings.isDarkMode ? `0 8px 32px ${theme.accent1}30` : `0 8px 32px ${theme.accent1}1A`,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-5 w-5" style={{ color: theme.accent1 }} />
              <span className="text-sm font-medium" style={{ color: theme.textMuted }}>Daily Inspiration</span>
            </div>
            <p className="text-base leading-relaxed" style={{ color: theme.text }}>{todayBriefing}</p>
          </div>
        )}

        <div>
          <div className="mb-4 flex items-center justify-between px-2">
            <h2 className="text-xl font-semibold" style={{ color: theme.text }}>오늘의 일정</h2>
            <button
              onClick={() => onNavigate('calendar')}
              className="flex items-center gap-1 text-sm font-medium transition-all hover:gap-2"
              style={{ color: theme.primary }}
            >
              전체 보기
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <div
                className="rounded-3xl border p-12 text-center"
                style={{
                  background: settings.isDarkMode ? `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary}10)` : 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)',
                  borderColor: settings.isDarkMode ? `${theme.primary}30` : 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <p className="text-base" style={{ color: theme.textMuted }}>오늘 일정이 없어요</p>
              </div>
            ) : (
              todayEvents
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((event, index) => {
                  const [hour] = event.startTime.split(':').map(Number);
                  const now = new Date();
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const eventMinutes = hour * 60;
                  const isPast = eventMinutes < currentMinutes;
                  const isCurrent = !isPast && eventMinutes <= currentMinutes + 30;
                  
                  return (
                    <div
                      key={event.id}
                      className="group rounded-2xl border p-4 text-left transition-all"
                      style={{
                        background: isCurrent 
                          ? `linear-gradient(135deg, ${theme.primary}25, ${theme.secondary}15)` 
                          : isPast 
                            ? settings.isDarkMode 
                              ? `${theme.primary}08` 
                              : 'rgba(255, 255, 255, 0.4)'
                            : settings.isDarkMode 
                              ? `linear-gradient(135deg, ${theme.secondary}20, ${theme.primary}10)` 
                              : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(20px)',
                        borderColor: isCurrent ? theme.primary : settings.isDarkMode ? `${theme.secondary}40` : 'rgba(255, 255, 255, 0.4)',
                        boxShadow: settings.isDarkMode ? `0 4px 16px ${theme.secondary}20` : '0 4px 16px rgba(0, 0, 0, 0.06)',
                        opacity: isPast ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center" style={{ minWidth: '50px' }}>
                          <div className="text-lg font-bold" style={{ color: isCurrent ? theme.primary : theme.text }}>
                            {event.startTime.split(':')[0]}
                          </div>
                          <div className="text-xs" style={{ color: theme.textMuted }}>
                            {event.startTime.split(':')[1]}
                          </div>
                        </div>

                        <div className="h-10 w-0.5 rounded-full" style={{ background: isCurrent ? theme.primary : theme.textMuted }} />

                        <div className="flex-1">
                          <h3 className="text-base font-semibold" style={{ color: theme.text }}>{event.title}</h3>
                          <p className="text-sm" style={{ color: theme.textMuted }}>{event.endTime}까지</p>
                        </div>

                        {isCurrent && (
                          <div 
                            className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{ background: theme.primary, color: '#fff' }}
                          >
                            지금
                          </div>
                        )}
                        {isPast && (
                          <div 
                            className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{ background: theme.textMuted, color: '#fff' }}
                          >
                            완료
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showHealthScheduler && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end p-3 md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="relative flex max-w-5xl flex-col rounded-[32px] border overflow-hidden max-h-[calc(100vh-48px)]"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: settings.isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(24px)',
              borderColor: settings.isDarkMode ? `${theme.primary}28` : 'rgba(255,255,255,0.6)',
              boxShadow: '0 24px 80px rgba(15,23,42,0.2)',
            }}
          >
            <div className="px-5 py-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" style={{ color: theme.accent1 }} />
                    <span className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                      Health To Planner
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>운동 일정 등록</h3>
                  <p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>
                    운동 일정이 있는 요일은 자동 체크되어 있습니다.
                  </p>
                </div>
                <button onClick={() => setShowHealthScheduler(false)} className="rounded-2xl p-2" style={{ background: theme.iconBg }}>
                  <X className="h-5 w-5" style={{ color: theme.textSecondary }} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 min-h-0">
              <div className="space-y-2 pb-3">
                {healthScheduleRows.map(row => (
                  <div
                    key={row.dayOfWeek}
                    className="grid grid-cols-[auto_72px_minmax(0,1fr)_140px] items-center gap-2 rounded-2xl border px-3 py-2.5"
                    style={{
                      background: row.selected
                        ? settings.isDarkMode
                          ? `linear-gradient(135deg, ${theme.primary}18, ${theme.accent1}14)`
                          : `linear-gradient(135deg, rgba(255,255,255,0.9), ${theme.primary}12)`
                        : settings.isDarkMode
                        ? 'rgba(15,23,42,0.6)'
                        : 'rgba(255,255,255,0.72)',
                      borderColor: row.selected ? `${theme.primary}36` : 'rgba(148,163,184,0.16)',
                    }}
                  >
                    <button
                      onClick={() => updateHealthRow(row.dayOfWeek, { selected: !row.selected })}
                      className="flex items-center justify-center"
                    >
                      <CheckCircle2
                        className="h-5 w-5"
                        style={{ color: row.selected ? theme.primary : settings.isDarkMode ? '#475569' : '#CBD5E1' }}
                      />
                    </button>

                    <div className="text-sm font-semibold" style={{ color: theme.text }}>
                      {row.label}요일
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-semibold" style={{ color: theme.textSecondary }}>{row.routineName}</span>
                        {row.planned && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: settings.isDarkMode ? `${theme.primary}22` : `${theme.primary}18`, color: theme.primary }}
                          >
                            {row.plans.length}주차
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                        {row.plans.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {row.plans.map((plan, idx) => (
                              <span key={idx} style={{ color: theme.primary }}>{plan.weekNumber}주차</span>
                            ))}
                          </span>
                        ) : (
                          <span className="truncate">{row.summary}</span>
                        )}
                      </div>
                    </div>

                    <input
                      type="time"
                      value={row.time}
                      onChange={event => updateHealthRow(row.dayOfWeek, { time: event.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                      style={{
                        background: settings.isDarkMode ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.88)',
                        color: theme.text,
                        borderColor: 'rgba(148,163,184,0.2)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-3 flex flex-col gap-2 border-t md:flex-row md:justify-end" style={{ borderColor: settings.isDarkMode ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.14)' }}>
              <button
                onClick={() => setShowHealthScheduler(false)}
                className="rounded-2xl px-4 py-3 font-medium"
                style={{ background: settings.isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(241,245,249,0.92)', color: theme.textSecondary }}
              >
                취소
              </button>
              <button
                onClick={handleRegisterHealthEvents}
                className="rounded-2xl px-5 py-3 font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})`,
                  color: '#fff',
                }}
              >
                캘린더에 운동 일정 등록
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
