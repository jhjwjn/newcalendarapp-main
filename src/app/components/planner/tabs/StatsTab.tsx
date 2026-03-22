import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';

export function StatsTab() {
  const { events, studySessions, categories, settings } = usePlanner();
  const theme = getPlannerTheme(settings);

  const getActivityHeatmap = () => {
    const days = [];
    const today = new Date();

    for (let i = 118; i >= 0; i -= 1) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEvents = events.filter(e => e.date === dateStr).length;
      const hasStudy = studySessions.some(s => s.date === dateStr);
      days.push({
        date: dateStr,
        activity: dayEvents + (hasStudy ? 1 : 0),
      });
    }

    return days;
  };

  const activityData = getActivityHeatmap();
  const maxActivity = Math.max(...activityData.map(d => d.activity), 1);
  const categoryStats = categories
    .map(cat => ({
      name: cat.name,
      value: events.filter(e => e.categoryId === cat.id).length,
      color: cat.color,
      emoji: cat.emoji,
    }))
    .filter(stat => stat.value > 0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = events.filter(e => e.date === todayStr).length;
  const examCategory = categories.find(c => c.name === '시험');
  const examEvents = examCategory ? events.filter(e => e.categoryId === examCategory.id).length : 0;
  const currentStreak = studySessions[studySessions.length - 1]?.streak || 0;

  const renderRing = (value: number, total: number, color: string) => {
    const safeRatio = Math.min(value / Math.max(total, 1), 1);
    return (
      <div className="relative mx-auto h-32 w-32">
        <svg className="h-32 w-32 -rotate-90 transform">
          <circle cx="64" cy="64" r="56" stroke={theme.line} strokeWidth="12" fill="none" />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeDasharray={`${safeRatio * 351.86} 351.86`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold" style={{ color: theme.text }}>{value}</div>
          <div className="text-xs" style={{ color: theme.textMuted }}>/ {total}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5">
      <div
        className="mb-4 rounded-[28px] border px-4 py-4"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
          Insights
        </div>
        <h2 className="text-2xl font-semibold" style={{ color: theme.text }}>
          통계
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-[28px] border p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>학습 스트릭</h3>
            <span className="text-2xl">🔥</span>
          </div>
          {renderRing(currentStreak, 30, '#f59e0b')}
        </div>

        <div className="rounded-[28px] border p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>오늘 일정</h3>
            <span className="text-2xl">📅</span>
          </div>
          {renderRing(todayEvents, 10, theme.primary)}
        </div>

        <div className="rounded-[28px] border p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>시험 일정</h3>
            <span className="text-2xl">📝</span>
          </div>
          {renderRing(examEvents, 5, theme.secondary)}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="rounded-[28px] border p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <h3 className="mb-4 text-lg font-semibold" style={{ color: theme.text }}>활동 히트맵 (최근 119일)</h3>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(17, 16px)' }}>
              {activityData.map(day => {
                const intensity = day.activity === 0 ? 0 : day.activity / maxActivity;
                const color = intensity === 0 ? theme.line : intensity < 0.25 ? '#bfdbfe' : intensity < 0.5 ? '#93c5fd' : intensity < 0.75 ? '#60a5fa' : theme.primary;
                return (
                  <div
                    key={day.date}
                    className="h-4 w-4 rounded-sm"
                    style={{ backgroundColor: color }}
                    title={`${format(new Date(day.date), 'M월 d일', { locale: ko })}: ${day.activity}개 활동`}
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
            <span>적음</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm" style={{ background: theme.line }} />
              <div className="h-3 w-3 rounded-sm bg-blue-200" />
              <div className="h-3 w-3 rounded-sm bg-blue-300" />
              <div className="h-3 w-3 rounded-sm bg-blue-400" />
              <div className="h-3 w-3 rounded-sm" style={{ background: theme.primary }} />
            </div>
            <span>많음</span>
          </div>
        </div>

        <div className="rounded-[28px] border p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <h3 className="mb-4 text-lg font-semibold" style={{ color: theme.text }}>카테고리별 일정 분포</h3>
          {categoryStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={58} outerRadius={96} paddingAngle={3} dataKey="value">
                    {categoryStats.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {categoryStats.map(stat => (
                  <div key={stat.name} className="flex items-center justify-between rounded-2xl px-3 py-2" style={{ background: theme.navBackground }}>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span className="text-sm" style={{ color: theme.textSecondary }}>
                        {stat.emoji} {stat.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: theme.text }}>
                      {stat.value}개 ({Math.round((stat.value / events.length) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-8 text-center" style={{ color: theme.textMuted }}>일정 데이터가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
