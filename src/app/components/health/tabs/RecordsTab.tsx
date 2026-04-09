import React, { useState, useMemo } from 'react';
import { useHealth } from '../../../context/HealthContext';
import { ChevronLeft, ChevronRight, Flame, Trash2, Clock, Dumbbell } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../../../lib/toast';
import { WorkoutFeedback } from '../WorkoutFeedback';

interface RecordsTabProps {
  theme: any;
}

export function RecordsTab({ theme }: RecordsTabProps) {
  const { workoutRecords, getRecordByDate, deleteWorkoutRecord, getCurrentStreak, getMonthlyWorkoutCount } = useHealth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthlyCount = getMonthlyWorkoutCount(year, month);
  const currentStreak = getCurrentStreak();
  const totalVolume = useMemo(() => workoutRecords.reduce((sum, r) => sum + (r.totalVolume || 0), 0), [workoutRecords]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const firstDayOfWeek = getDay(startOfMonth(currentDate));
  const calendarDays = [...Array(firstDayOfWeek).fill(null), ...daysInMonth];

  const selectedRecord = selectedDate ? getRecordByDate(format(selectedDate, 'yyyy-MM-dd')) : null;

  const handleDelete = async (id: string) => {
    await deleteWorkoutRecord(id);
    toast.success('운동 기록이 삭제되었습니다');
  };

  const getWorkoutDuration = (record: typeof selectedRecord) => {
    if (!record || !record.startTime || !record.endTime) return null;
    const start = new Date(record.startTime);
    const end = new Date(record.endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return `${minutes}분`;
  };

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
          Records
        </p>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>운동 기록</h1>
      </div>

      {/* AI 운동 균형 분석 */}
      <WorkoutFeedback theme={theme} />

      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '이번달', value: monthlyCount, unit: '회', color: theme.primary },
          { label: '연속', value: currentStreak, unit: '일', icon: '🔥', color: theme.accent1 || theme.primary },
          { label: '총 볼륨', value: (totalVolume / 1000).toFixed(1), unit: 't', color: theme.secondary || theme.primary },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border p-3 text-center"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <div className="text-xl font-black" style={{ color: stat.color }}>
              {stat.icon && <span>{stat.icon} </span>}{stat.value}
            </div>
            <div className="text-[10px] font-medium mt-0.5" style={{ color: theme.textMuted }}>
              {stat.unit} · {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 월간 캘린더 */}
        <div
          className="rounded-2xl border p-4"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          {/* 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: theme.text }}>
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-xl"
                style={{ background: theme.navBackground, color: theme.textSecondary }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-xl"
                style={{ background: theme.navBackground, color: theme.textSecondary }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: theme.textMuted }}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const dateStr = format(day, 'yyyy-MM-dd');
              const record = getRecordByDate(dateStr);
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
              const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all relative"
                  style={{
                    background: isSelected
                      ? theme.primary
                      : record
                      ? `${theme.primary}18`
                      : 'transparent',
                    color: isSelected ? '#fff' : isToday ? theme.primary : theme.text,
                    border: isToday && !isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
                  }}
                >
                  {format(day, 'd')}
                  {record && !isSelected && (
                    <div
                      className="absolute bottom-0.5 h-1 w-1 rounded-full"
                      style={{ background: theme.primary }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택한 날짜 운동 상세 */}
        <div
          className="rounded-2xl border p-4"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: theme.text }}>
                  {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
                </h3>
                {selectedRecord && (
                  <button
                    onClick={() => handleDelete(selectedRecord.id)}
                    className="p-1.5 rounded-xl text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {selectedRecord ? (
                <div className="space-y-3">
                  {/* 운동 요약 */}
                  <div className="grid grid-cols-2 gap-2">
                    {getWorkoutDuration(selectedRecord) && (
                      <div className="rounded-xl p-3" style={{ background: theme.navBackground }}>
                        <Clock className="h-3.5 w-3.5 mb-1" style={{ color: theme.primary }} />
                        <p className="text-sm font-bold" style={{ color: theme.text }}>
                          {getWorkoutDuration(selectedRecord)}
                        </p>
                        <p className="text-[10px]" style={{ color: theme.textMuted }}>운동 시간</p>
                      </div>
                    )}
                    <div className="rounded-xl p-3" style={{ background: theme.navBackground }}>
                      <Dumbbell className="h-3.5 w-3.5 mb-1" style={{ color: theme.primary }} />
                      <p className="text-sm font-bold" style={{ color: theme.text }}>
                        {selectedRecord.totalVolume.toLocaleString()} kg
                      </p>
                      <p className="text-[10px]" style={{ color: theme.textMuted }}>총 볼륨</p>
                    </div>
                  </div>

                  {/* 운동 목록 */}
                  <div className="space-y-2">
                    {selectedRecord.exercises.map((ex, idx) => {
                      const mainSets = ex.sets.filter(s => !s.isWarmup);
                      return (
                        <div
                          key={ex.id || idx}
                          className="rounded-xl p-3"
                          style={{ background: theme.navBackground }}
                        >
                          <p className="text-sm font-bold mb-1.5" style={{ color: theme.text }}>
                            {ex.name}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {mainSets.map((set, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-lg"
                                style={{ background: `${theme.primary}15`, color: theme.primary }}
                              >
                                {set.weight}kg × {set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Dumbbell className="h-8 w-8 mb-2 opacity-20" style={{ color: theme.textMuted }} />
                  <p className="text-sm font-medium" style={{ color: theme.textMuted }}>이 날 운동 기록 없음</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <p className="text-sm font-medium" style={{ color: theme.textMuted }}>
                날짜를 선택하면 운동 기록을 볼 수 있어요
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 최근 기록 목록 */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: theme.text }}>최근 운동 기록</h2>
        {workoutRecords.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: theme.textMuted }}>
            아직 운동 기록이 없어요
          </p>
        ) : (
          <div className="space-y-2">
            {[...workoutRecords]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map(record => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: theme.navBackground }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: theme.text }}>
                      {format(new Date(record.date), 'M월 d일 (E)', { locale: ko })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                      {record.exercises.map(e => e.name).join(' · ')}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-xl"
                    style={{ background: `${theme.primary}15`, color: theme.primary }}
                  >
                    {record.totalVolume.toLocaleString()} kg
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
