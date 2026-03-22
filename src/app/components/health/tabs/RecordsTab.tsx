import React, { useState } from 'react';
import { useHealth } from '../../../context/HealthContext';
import { ChevronLeft, ChevronRight, Flame, X, TrendingUp, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { registerWorkoutRecordToPlanner } from '../../../lib/plannerWorkoutSync';
import { toast } from '../../../lib/toast';

interface RecordsTabProps {
  theme: any;
}

export function RecordsTab({ theme }: RecordsTabProps) {
  const {
    workoutRecords,
    getRecordByDate,
    getCurrentStreak,
    getMonthlyWorkoutCount,
  } = useHealth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showMonthReport, setShowMonthReport] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthlyCount = getMonthlyWorkoutCount(year, month);
  const currentStreak = getCurrentStreak();

  // 달력 생성
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);
  const calendarDays = [
    ...Array(firstDayOfWeek).fill(null),
    ...daysInMonth,
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
  };

  const selectedRecord = selectedDate ? getRecordByDate(format(selectedDate, 'yyyy-MM-dd')) : null;

  return (
    <div className="min-h-full pb-24" style={{ backgroundColor: theme.bg }}>
      <div className="mx-auto max-w-[1320px] px-4 pb-6 pt-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-1 md:mb-2" style={{ color: theme.text }}>
              RECORDS
            </h1>
            <p className="text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl md:rounded-2xl"
              style={{ background: theme.panelBackgroundStrong || theme.card, border: `1px solid ${theme.cardBorder}`, boxShadow: theme.panelShadow }}
            >
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" style={{ color: theme.text }} />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl md:rounded-2xl"
              style={{ background: theme.panelBackgroundStrong || theme.card, border: `1px solid ${theme.cardBorder}`, boxShadow: theme.panelShadow }}
            >
              <ChevronRight className="w-4 h-4 md:w-6 md:h-6" style={{ color: theme.text }} />
            </button>
          </div>
        </div>

        {/* 상단 통계 카드 - 모바일 가로 한 줄 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="rounded-xl md:rounded-2xl p-3 md:p-4" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.elevatedShadow }}>
            <div className="mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
              <Calendar className="w-3.5 h-3.5 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <span className="text-[10px] md:text-xs font-bold" style={{ color: theme.textSecondary }}>이번 달</span>
            </div>
            <div className="text-2xl md:text-4xl font-black" style={{ color: theme.text }}>{monthlyCount}</div>
            <div className="text-[10px] md:text-xs font-semibold" style={{ color: theme.textMuted }}>회</div>
          </div>

          <div className="rounded-xl md:rounded-2xl p-3 md:p-4" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.elevatedShadow }}>
            <div className="mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
              <Flame className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500" />
              <span className="text-[10px] md:text-xs font-bold" style={{ color: theme.textSecondary }}>연속</span>
            </div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl md:text-4xl font-black" style={{ color: theme.text }}>{currentStreak}</div>
              <Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
            </div>
            <div className="text-[10px] md:text-xs font-semibold" style={{ color: theme.textMuted }}>일</div>
          </div>

          <div className="rounded-xl md:rounded-2xl p-3 md:p-4" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.elevatedShadow }}>
            <div className="mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
              <TrendingUp className="w-3.5 h-3.5 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <span className="text-[10px] md:text-xs font-bold" style={{ color: theme.textSecondary }}>볼륨</span>
            </div>
            <div className="text-2xl md:text-3xl font-black truncate" style={{ color: theme.text }}>
              {workoutRecords
                .filter(r => {
                  const d = new Date(r.date);
                  return d.getFullYear() === year && d.getMonth() === month;
                })
                .reduce((sum, r) => sum + r.totalVolume, 0)
                .toLocaleString()}
            </div>
            <div className="text-[10px] md:text-xs font-semibold" style={{ color: theme.textMuted }}>kg</div>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {/* 달력 */}
          <div 
            className="rounded-2xl md:rounded-[28px] p-3 md:p-5 shadow-lg md:shadow-2xl border"
            style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}
          >
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3 md:mb-4">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-[10px] md:text-sm font-black" style={{ color: theme.textMuted }}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasRecord = getRecordByDate(dateStr);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(day)}
                    className="aspect-square rounded-lg md:rounded-2xl flex items-center justify-center text-xs md:text-sm font-bold transition-all relative"
                    style={{
                      backgroundColor: isSelected
                        ? theme.accentSurfaceStrong || theme.accent
                        : isToday
                        ? theme.buttonGradient || theme.primary
                        : 'transparent',
                      color: isToday ? theme.bg : isSameMonth(day, currentDate) ? theme.text : theme.textMuted,
                    }}
                  >
                    {format(day, 'd')}
                    {hasRecord && !isToday && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 md:bottom-1.5 md:w-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                    )}
                    {hasRecord && isToday && (
                      <div className="absolute bottom-1 w-1 h-1 md:bottom-1.5 md:w-1.5 rounded-full" style={{ backgroundColor: theme.bg }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setShowMonthReport(true)}
            className="w-full py-3 md:py-4 rounded-2xl md:rounded-3xl font-bold md:font-black text-sm md:text-base shadow-lg md:shadow-xl"
            style={{
              background: theme.buttonGradient || theme.primary,
              color: theme.bg,
              boxShadow: theme.buttonShadow,
            }}
          >
            📊 {format(currentDate, 'yyyy년 M월', { locale: ko })} 리포트 보기
          </button>
        </div>
      </div>

      {/* 선택한 날짜 상세 */}
      {selectedDate && selectedRecord && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          />
          <div 
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
            onClick={() => setSelectedDate(null)}
          >
          <div 
            className="rounded-t-2xl md:rounded-3xl p-4 md:p-6 max-h-[80vh] overflow-y-auto md:max-w-2xl md:w-full shadow-xl md:shadow-2xl"
            style={{ background: theme.panelBackgroundStrong || theme.card, boxShadow: theme.elevatedShadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>
                  {format(selectedDate, 'M월 d일 EEEE', { locale: ko })}
                </h3>
                <p className="text-xs md:text-sm font-semibold" style={{ color: theme.textSecondary }}>
                  {selectedRecord.weekNumber}주차 · 총 볼륨 {selectedRecord.totalVolume.toLocaleString()}kg
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)}>
                <X className="w-5 h-5 md:w-7 md:h-7" style={{ color: theme.textMuted }} />
              </button>
            </div>

            <div className="space-y-2 md:space-y-3">
              {selectedRecord.exercises.map((exercise) => (
                <div 
                  key={exercise.id} 
                  className="rounded-xl md:rounded-2xl p-3 md:p-5"
                  style={{ background: theme.accentSurface, boxShadow: theme.panelShadow }}
                >
                  <h4 className="font-black text-sm md:text-lg mb-2 md:mb-4" style={{ color: theme.text }}>{exercise.name}</h4>
                  <div className="space-y-1.5 md:space-y-2">
                    {exercise.sets.map((set, idx) => (
                      <div key={set.id} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-semibold">
                        <span style={{ color: theme.textMuted }} className="w-12 md:w-16">세트 {idx + 1}</span>
                        <span style={{ color: theme.text }}>{set.weight}kg</span>
                        <span style={{ color: theme.textMuted }}>×</span>
                        <span style={{ color: theme.text }}>{set.reps}회</span>
                        {set.completed && (
                          <span className="ml-auto" style={{ color: theme.primary }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const result = registerWorkoutRecordToPlanner(selectedRecord);
                if (result.status === 'missing-category') {
                  toast.error('캘린더 앱에 운동 카테고리가 없습니다. 설정에서 추가해주세요.');
                  return;
                }
                if (result.status === 'missing-schedule') {
                  toast.error('캘린더앱에서 먼저 운동 일정을 등록해주세요!');
                  return;
                }
                toast.success('캘린더 일정 메모에 운동 기록이 등록되었습니다.');
                setSelectedDate(null);
              }}
              className="mt-3 md:mt-5 w-full rounded-xl md:rounded-2xl px-4 py-3 md:py-4 text-xs md:text-sm font-bold md:font-black"
              style={{ background: theme.buttonGradient || theme.primary, color: theme.bg, boxShadow: theme.buttonShadow }}
            >
              캘린더 앱에 등록
            </button>
          </div>
          </div>
        </>
      )}

      {/* 월간 리포트 */}
      <AnimatePresence>
        {showMonthReport && (
          <>
            <motion.div
              className="fixed inset-0 z-50"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMonthReport(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setShowMonthReport(false)}
            >
              <motion.div
                className="rounded-t-3xl md:rounded-3xl p-6 max-h-[80vh] overflow-y-auto md:max-w-2xl md:w-full shadow-2xl"
                style={{ backgroundColor: theme.card }}
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>
                  {format(currentDate, 'yyyy년 M월', { locale: ko })} 리포트
                </h3>
                <button onClick={() => setShowMonthReport(false)}>
                  <X className="w-5 h-5 md:w-7 md:h-7" style={{ color: theme.textMuted }} />
                </button>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="rounded-xl md:rounded-2xl p-4 md:p-6" style={{ backgroundColor: theme.accent }}>
                  <div className="text-xs md:text-sm font-bold mb-1 md:mb-2" style={{ color: theme.textSecondary }}>총 운동 횟수</div>
                  <div className="text-2xl md:text-4xl font-black" style={{ color: theme.text }}>{monthlyCount}회</div>
                </div>

                <div className="rounded-xl md:rounded-2xl p-4 md:p-6" style={{ backgroundColor: theme.accent }}>
                  <div className="text-xs md:text-sm font-bold mb-1 md:mb-2" style={{ color: theme.textSecondary }}>월간 총 볼륨</div>
                  <div className="text-2xl md:text-4xl font-black" style={{ color: theme.text }}>
                    {workoutRecords
                      .filter(r => {
                        const d = new Date(r.date);
                        return d.getFullYear() === year && d.getMonth() === month;
                      })
                      .reduce((sum, r) => sum + r.totalVolume, 0)
                      .toLocaleString()}kg
                  </div>
                </div>

                <div className="rounded-xl md:rounded-2xl p-4 md:p-6" style={{ backgroundColor: theme.accent }}>
                  <div className="text-xs md:text-sm font-bold mb-2 md:mb-3" style={{ color: theme.textSecondary }}>운동한 날</div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {workoutRecords
                      .filter(r => {
                        const d = new Date(r.date);
                        return d.getFullYear() === year && d.getMonth() === month;
                      })
                      .map(r => (
                        <span 
                          key={r.id} 
                          className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold"
                          style={{ backgroundColor: theme.primary, color: theme.bg }}
                        >
                          {format(new Date(r.date), 'M/d')}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
    </div>
  );
}
