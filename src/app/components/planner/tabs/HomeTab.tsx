import React from 'react';
import { usePlanner } from '../../../context/PlannerContext';
import { Calendar, Clock, FileText, Dumbbell, TrendingUp, ChevronRight } from 'lucide-react';
import { format, isToday, isBefore, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HomeTabProps {
  onNavigate: (tab: 'calendar' | 'notes') => void;
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  const { events, notes, categories, studySessions, settings, todayBriefing } = usePlanner();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const threeDaysLater = addDays(today, 3);

  // 오늘 일정
  const todayEvents = events.filter(e => e.date === todayStr);

  // 3일 이내 마감 일정
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return isBefore(eventDate, threeDaysLater) && !isToday(new Date(e.date));
  });

  // 오늘 이후 가장 가까운 일정 4개
  const nextEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // 오늘 학습 여부
  const todaySession = studySessions.find(s => s.date === todayStr);
  const currentStreak = studySessions[studySessions.length - 1]?.streak || 0;

  // 이번 달 캘린더 미니
  const getDaysInMonth = () => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // 첫 주 빈칸
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 날짜들
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }

    return days;
  };

  const daysInMonth = getDaysInMonth();

  const getEventCountForDay = (day: number) => {
    const dateStr = format(new Date(today.getFullYear(), today.getMonth(), day), 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr).length;
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || '#gray';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 mt-14">
      {/* 인사말 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요{settings.name ? `, ${settings.name}님` : ''}! 👋
        </h2>
        <p className="text-gray-600">
          {format(today, 'yyyy년 M월 d일 EEEE', { locale: ko })}
        </p>
      </div>

      {/* 퀵 액션 카드들 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('calendar')}
          className="rounded-xl p-4 text-left hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--planner-accent)' }}
        >
          <Calendar className="w-8 h-8 mb-2" style={{ color: 'var(--planner-primary)' }} />
          <div className="text-2xl font-bold text-gray-900">{todayEvents.length}</div>
          <div className="text-sm text-gray-600">오늘 일정</div>
        </button>

        <button
          onClick={() => onNavigate('calendar')}
          className="bg-orange-50 rounded-xl p-4 text-left hover:bg-orange-100 transition-colors"
        >
          <Clock className="w-8 h-8 text-orange-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</div>
          <div className="text-sm text-gray-600">3일 내 마감</div>
        </button>

        <button
          onClick={() => onNavigate('notes')}
          className="bg-green-50 rounded-xl p-4 text-left hover:bg-green-100 transition-colors"
        >
          <FileText className="w-8 h-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{notes.length}</div>
          <div className="text-sm text-gray-600">저장된 메모</div>
        </button>

        <button 
          className="rounded-xl p-4 text-left hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--planner-primary-light)' }}
        >
          <Dumbbell className="w-8 h-8 mb-2" style={{ color: 'var(--planner-primary-dark)' }} />
          <div className="text-sm text-gray-600">헬스 일정 등록</div>
        </button>
      </div>

      {/* AI 브리핑 */}
      {todayBriefing && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            오늘의 브리핑
          </h3>
          <p className="text-gray-700 leading-relaxed">{todayBriefing}</p>
        </div>
      )}

      {/* 학습 현황 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">학습 현황</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">오늘 학습</div>
            <div className="text-xl font-bold text-gray-900">
              {todaySession ? '완료 ✓' : '미완료'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">연속 학습일</div>
            <div className="text-xl font-bold text-orange-600">{currentStreak}일 🔥</div>
          </div>
        </div>
      </div>

      {/* 미니 캘린더 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {format(today, 'M월', { locale: ko })} 캘린더
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 pb-2">
              {day}
            </div>
          ))}
          {daysInMonth.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }
            const eventCount = getEventCountForDay(day);
            const isCurrentDay = day === today.getDate();
            return (
              <button
                key={day}
                onClick={() => onNavigate('calendar')}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${
                  isCurrentDay
                    ? 'bg-blue-600 text-white font-bold'
                    : eventCount > 0
                    ? 'bg-blue-50 text-gray-900 hover:bg-blue-100'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{day}</span>
                {eventCount > 0 && !isCurrentDay && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-blue-600" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 다가오는 일정 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">다가오는 일정</h3>
        <div className="space-y-3">
          {nextEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">다가오는 일정이 없습니다</p>
          ) : (
            nextEvents.map(event => {
              const eventDate = new Date(event.date);
              const dDay = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={event.id}
                  onClick={() => onNavigate('calendar')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: getCategoryColor(event.categoryId) }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-600">
                      {format(eventDate, 'M월 d일 (E)', { locale: ko })} · {event.startTime}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-blue-600">
                    {dDay === 0 ? '오늘' : `D-${dDay}`}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}