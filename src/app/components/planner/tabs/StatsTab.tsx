import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, BookOpen, Zap, TrendingUp } from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';

export function StatsTab() {
  const { events, studySessions, categories, habits, habitRecords, settings } = usePlanner();
  const theme = getPlannerTheme(settings);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // 최근 30일 이벤트 히트맵
  const last30Days = useMemo(() => {
    return eachDayOfInterval({ start: subDays(today, 29), end: today });
  }, []);

  const activityData = useMemo(() => {
    return last30Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter(e => e.date === dateStr).length;
      const hasStudy = studySessions.some(s => s.date === dateStr);
      const habitsDone = habitRecords.filter(r => r.date === dateStr).length;
      return {
        date: dateStr,
        label: format(day, 'd일', { locale: ko }),
        activity: dayEvents + (hasStudy ? 1 : 0) + Math.min(habitsDone, 2),
        events: dayEvents,
      };
    });
  }, [last30Days, events, studySessions, habitRecords]);

  const maxActivity = Math.max(...activityData.map(d => d.activity), 1);

  // 카테고리 통계
  const categoryStats = useMemo(() => {
    return categories
      .map(cat => ({
        name: cat.name,
        value: events.filter(e => e.categoryId === cat.id).length,
        color: cat.color,
        emoji: cat.emoji,
      }))
      .filter(stat => stat.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, events]);

  const totalEvents = events.length;
  const thisMonthEvents = events.filter(e => e.date.startsWith(format(today, 'yyyy-MM'))).length;
  const currentStreak = studySessions[studySessions.length - 1]?.streak || 0;
  const totalStudied = studySessions.reduce((sum, s) => sum + s.cardsStudied, 0);

  // 습관 완료율 (최근 7일)
  const habitStats = useMemo(() => {
    const last7 = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return habits.map(habit => {
      const completed = last7.filter(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();
        const isDue = habit.targetDays.length === 0 || habit.targetDays.includes(dayOfWeek);
        return isDue && habitRecords.some(r => r.habitId === habit.id && r.date === dateStr);
      }).length;
      const total = last7.filter(day => {
        const dayOfWeek = day.getDay();
        return habit.targetDays.length === 0 || habit.targetDays.includes(dayOfWeek);
      }).length;
      return { ...habit, completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [habits, habitRecords, last30Days]);

  // 최근 7일 학습 바 차트
  const studyBarData = useMemo(() => {
    return eachDayOfInterval({ start: subDays(today, 6), end: today }).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const session = studySessions.find(s => s.date === dateStr);
      return {
        label: format(day, 'E', { locale: ko }),
        cards: session?.cardsStudied || 0,
        correct: session?.correctAnswers || 0,
      };
    });
  }, [studySessions]);

  const statCards = [
    { label: '이번달 일정', value: thisMonthEvents, unit: '개', icon: Calendar, color: theme.primary },
    { label: '총 일정', value: totalEvents, unit: '개', icon: Calendar, color: theme.secondary },
    { label: '학습 스트릭', value: currentStreak, unit: '일', icon: BookOpen, color: theme.tertiary },
    { label: '총 학습', value: totalStudied, unit: '장', icon: TrendingUp, color: theme.accent1 || theme.primary },
  ];

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
          Analytics
        </p>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>통계</h1>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border p-4"
              style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
            >
              <div
                className="flex items-center justify-center h-9 w-9 rounded-xl mb-3"
                style={{ background: `${card.color}18` }}
              >
                <Icon className="h-4 w-4" style={{ color: card.color }} />
              </div>
              <div>
                <span className="text-2xl font-black" style={{ color: theme.text }}>{card.value}</span>
                <span className="text-xs font-medium ml-0.5" style={{ color: theme.textMuted }}>{card.unit}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* 활동 히트맵 (최근 30일) */}
      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: theme.text }}>최근 30일 활동</h2>
        <div className="flex flex-wrap gap-[3px]">
          {activityData.slice(-30).map((day, idx) => {
            const intensity = day.activity / maxActivity;
            return (
              <div
                key={idx}
                title={`${day.date}: 이벤트 ${day.events}개`}
                className="h-[14px] w-[14px] rounded-[3px] transition-all cursor-default shrink-0"
                style={{
                  background: intensity > 0
                    ? `${theme.primary}${Math.round(intensity * 0.8 * 255).toString(16).padStart(2, '0')}`
                    : theme.line,
                  opacity: intensity > 0 ? 0.6 + intensity * 0.4 : 0.25,
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px]" style={{ color: theme.textMuted }}>적음</span>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
            <div
              key={v}
              className="h-[10px] w-[10px] rounded-[2px]"
              style={{ background: `${theme.primary}${Math.round(v * 0.8 * 255).toString(16).padStart(2, '0')}` }}
            />
          ))}
          <span className="text-[10px]" style={{ color: theme.textMuted }}>많음</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 카테고리 파이 차트 */}
        {categoryStats.length > 0 && (
          <div
            className="rounded-2xl border p-4 md:p-5"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: theme.text }}>카테고리별 일정</h2>
            <div className="flex items-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: theme.shellBackground,
                        border: `1px solid ${theme.shellBorder}`,
                        borderRadius: '12px',
                        color: theme.text,
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`${value}개`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryStats.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>
                        {cat.emoji} {cat.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: theme.text }}>{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 최근 7일 학습 */}
        <div
          className="rounded-2xl border p-4 md:p-5"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <h2 className="text-sm font-bold mb-4" style={{ color: theme.text }}>최근 7일 학습</h2>
          {studyBarData.some(d => d.cards > 0) ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={studyBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.line} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: theme.textMuted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.textMuted }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: theme.shellBackground,
                    border: `1px solid ${theme.shellBorder}`,
                    borderRadius: '12px',
                    color: theme.text,
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    `${value}장`,
                    name === 'cards' ? '학습' : '정답',
                  ]}
                />
                <Bar dataKey="cards" fill={`${theme.secondary}90`} radius={[4, 4, 0, 0]} />
                <Bar dataKey="correct" fill={`${theme.primary}cc`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 text-center">
              <BookOpen className="h-8 w-8 mb-2 opacity-20" style={{ color: theme.textMuted }} />
              <p className="text-xs" style={{ color: theme.textMuted }}>학습 기록이 없어요</p>
            </div>
          )}
        </div>
      </div>

      {/* 습관 통계 */}
      {habitStats.length > 0 && (
        <div
          className="rounded-2xl border p-4 md:p-5"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4" style={{ color: theme.primary }} />
            <h2 className="text-sm font-bold" style={{ color: theme.text }}>습관 달성률 (최근 7일)</h2>
          </div>
          <div className="space-y-3">
            {habitStats.map(habit => (
              <div key={habit.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{habit.emoji}</span>
                    <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>
                      {habit.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>
                    {habit.rate}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.line }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${habit.rate}%`,
                      background: habit.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
