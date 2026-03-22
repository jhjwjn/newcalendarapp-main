import React, { useState } from 'react';
import { useHealth } from '../../../context/HealthContext';
import { ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export function RecordTab() {
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

  // 이번 주 볼륨 계산
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weekVolumes = weekDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const record = getRecordByDate(dateStr);
    return record?.totalVolume || 0;
  });

  const maxVolume = Math.max(...weekVolumes, 1);

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
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--planner-bg)' }}>
      <div className="px-4 pt-20 pb-4 md:pb-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ letterSpacing: '0.02em' }}>
            RECORDS
          </h1>
          <div className="flex gap-1.5 md:gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full bg-white border border-gray-200"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full bg-white border border-gray-200"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
        <p className="text-xs md:text-sm text-gray-500">
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </p>
      </div>

      <div className="px-4 space-y-3 md:space-y-4">
        {/* 통계 카드 - 가로 한 줄 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="text-[10px] md:text-sm text-gray-500 mb-1">이번 달</div>
            <div className="text-2xl md:text-4xl font-bold">{monthlyCount}</div>
            <div className="text-[10px] md:text-sm text-gray-500">회</div>
          </div>
          
          <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="text-[10px] md:text-sm text-gray-500 mb-1 flex items-center gap-1">
              연속 출석
            </div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl md:text-4xl font-bold">{currentStreak}</div>
              <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 mb-0.5 md:mb-1" />
            </div>
            <div className="text-[10px] md:text-sm text-gray-500">일</div>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5">
            <div className="text-[10px] md:text-sm text-gray-500 mb-1 flex items-center gap-1">
              주간 볼륨
            </div>
            <div className="text-2xl md:text-4xl font-bold">
              {Math.max(...weekVolumes).toLocaleString()}
            </div>
            <div className="text-[10px] md:text-sm text-gray-500">kg</div>
          </div>
        </div>

        {/* 달력 */}
        <div className="bg-white rounded-2xl p-3 md:p-5">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2 md:mb-3">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="text-center text-[10px] md:text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-7 gap-1">
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
                  className={`aspect-square rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-medium transition-all relative ${
                    isSelected
                      ? 'bg-gray-200'
                      : isToday
                      ? 'bg-black text-white'
                      : isSameMonth(day, currentDate)
                      ? 'text-gray-900 hover:bg-gray-50'
                      : 'text-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                  {hasRecord && !isToday && !isSelected && (
                    <div className="absolute bottom-0.5 w-1 h-1 bg-black rounded-full" />
                  )}
                  {hasRecord && isToday && (
                    <div className="absolute bottom-0.5 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 월간 리포트 버튼 */}
        <button
          onClick={() => setShowMonthReport(true)}
          className="w-full py-3 md:py-4 bg-white rounded-xl md:rounded-2xl font-semibold text-gray-900 shadow-sm border border-gray-200 text-sm"
        >
          📊 {format(currentDate, 'yyyy년 M월', { locale: ko })} 리포트
        </button>
      </div>

      {/* 선택한 날짜 상세 */}
      {selectedDate && selectedRecord && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setSelectedDate(null)}
          />
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl md:rounded-t-3xl z-50 p-4 md:p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold">
                  {format(selectedDate, 'M월 d일 EEEE', { locale: ko })}
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  {selectedRecord.weekNumber}주차 · 총 볼륨 {selectedRecord.totalVolume}kg
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)}>
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="space-y-2 md:space-y-3">
              {selectedRecord.exercises.map((exercise) => (
                <div key={exercise.id} className="bg-gray-50 rounded-xl p-3 md:p-4">
                  <h4 className="font-semibold text-sm md:text-base mb-2 md:mb-3">{exercise.name}</h4>
                  <div className="space-y-1.5 md:space-y-2">
                    {exercise.sets.map((set, idx) => (
                      <div key={set.id} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                        <span className="text-gray-500 w-10 md:w-12">세트 {idx + 1}</span>
                        <span className="font-medium">{set.weight}kg</span>
                        <span className="text-gray-500">×</span>
                        <span className="font-medium">{set.reps}회</span>
                        {set.completed && (
                          <span className="ml-auto text-green-600">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                className="bg-white rounded-t-2xl md:rounded-3xl p-4 md:p-6 max-h-[80vh] overflow-y-auto md:max-w-2xl md:w-full shadow-xl md:shadow-2xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold">
                    {format(currentDate, 'yyyy년 M월', { locale: ko })} 리포트
                  </h3>
                  <button onClick={() => setShowMonthReport(false)}>
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

            <div className="space-y-3 md:space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 md:p-5">
                <div className="text-xs md:text-sm text-gray-500 mb-1">총 운동 횟수</div>
                <div className="text-2xl md:text-3xl font-bold">{monthlyCount}회</div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 md:p-5">
                <div className="text-xs md:text-sm text-gray-500 mb-1">월간 총 볼륨</div>
                <div className="text-2xl md:text-3xl font-bold">
                  {workoutRecords
                    .filter(r => {
                      const d = new Date(r.date);
                      return d.getFullYear() === year && d.getMonth() === month;
                    })
                    .reduce((sum, r) => sum + r.totalVolume, 0)
                    .toLocaleString()}kg
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 md:p-5">
                <div className="text-xs md:text-sm text-gray-500 mb-1">운동한 날</div>
                <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3">
                  {workoutRecords
                    .filter(r => {
                      const d = new Date(r.date);
                      return d.getFullYear() === year && d.getMonth() === month;
                    })
                    .map(r => (
                      <span key={r.id} className="px-2.5 py-1 md:px-3 md:py-1 bg-black text-white rounded-full text-[10px] md:text-xs">
                        {format(new Date(r.date), 'M/d')}
                      </span>
                    ))}
                </div>
              </div>
            </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <div className="text-sm text-gray-500 mb-1">월간 총 볼륨</div>
                <div className="text-3xl font-bold">
                  {workoutRecords
                    .filter(r => {
                      const d = new Date(r.date);
                      return d.getFullYear() === year && d.getMonth() === month;
                    })
                    .reduce((sum, r) => sum + r.totalVolume, 0)
                    .toLocaleString()}kg
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <div className="text-sm text-gray-500 mb-1">운동한 날</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {workoutRecords
                    .filter(r => {
                      const d = new Date(r.date);
                      return d.getFullYear() === year && d.getMonth() === month;
                    })
                    .map(r => (
                      <span key={r.id} className="px-3 py-1 bg-black text-white rounded-full text-xs">
                        {format(new Date(r.date), 'M/d')}
                      </span>
                    ))}
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
