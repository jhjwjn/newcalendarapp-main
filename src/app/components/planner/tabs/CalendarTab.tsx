import React, { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, GripVertical, GripHorizontal, Repeat, X, Trash2, Edit2, Dumbbell } from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { EventSheet } from '../EventSheet';
import { CalendarEvent } from '../../../types/planner';
import { toast } from '../../../lib/toast';

type ViewMode = 'month' | 'week' | 'day';

const HOUR_HEIGHT = 64;

interface CalendarTabProps {
  showRepeatModal?: boolean;
  setShowRepeatModal?: (show: boolean) => void;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getNextDateForDayOfWeek(dayOfWeek: number, fromDate: Date): Date {
  const date = new Date(fromDate);
  const diff = (dayOfWeek - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + (diff === 0 ? 7 : diff));
  return date;
}

export function CalendarTab({ showRepeatModal = false, setShowRepeatModal }: CalendarTabProps = {}) {
  const { events, categories, settings, updateEvent, addEvent } = usePlanner();
  const theme = getPlannerTheme(settings);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventSheet, setShowEventSheet] = useState(false);
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);

  // 운동일정 등록 모달
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutModalWeek, setWorkoutModalWeek] = useState(1);
  const [workoutModalSelectedDays, setWorkoutModalSelectedDays] = useState<Set<number>>(new Set());
  const [workoutModalStartTime, setWorkoutModalStartTime] = useState('07:00');
  const [workoutModalEndTime, setWorkoutModalEndTime] = useState('08:00');
  const [weekPlansData, setWeekPlansData] = useState<any[]>([]);

  // Drag state
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragPreview, setDragPreview] = useState<{ date: string; hour: number } | null>(null);

  const repeatEvents = useMemo(() => {
    return events.filter(e => e.repeat && e.repeat !== 'none');
  }, [events]);

  const getCategoryColor = (categoryId: string) => categories.find(c => c.id === categoryId)?.color || '#6b7280';

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events
      .filter(event => event.date === dateStr)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  };

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const monthlyEventsByCategory = useMemo(() => {
    const monthLabel = format(currentDate, 'yyyy-MM');
    return categories
      .map(category => ({
        ...category,
        items: events
          .filter(event => event.categoryId === category.id && event.date.startsWith(monthLabel))
          .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
      }))
      .filter(category => category.items.length > 0);
  }, [categories, currentDate, events]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const openNewEvent = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setCurrentDate(date);
    }
    setSelectedEvent(null);
    setShowEventSheet(true);
  };

  const openWorkoutModal = () => {
    try {
      const stored = localStorage.getItem('health_week_plans');
      const plans = stored ? JSON.parse(stored) : [];
      setWeekPlansData(plans);
      const plan = plans.find((p: any) => p.weekNumber === 1);
      if (plan) {
        const days = plan.days.filter((d: any) => !d.isRestDay && d.exercises.length > 0).map((d: any) => d.dayOfWeek);
        setWorkoutModalSelectedDays(new Set(days));
      } else {
        setWorkoutModalSelectedDays(new Set());
      }
    } catch {
      setWeekPlansData([]);
      setWorkoutModalSelectedDays(new Set());
    }
    setWorkoutModalWeek(1);
    setShowWorkoutModal(true);
  };

  const handleWorkoutWeekChange = (weekNum: number) => {
    setWorkoutModalWeek(weekNum);
    const plan = weekPlansData.find((p: any) => p.weekNumber === weekNum);
    if (plan) {
      const days = plan.days.filter((d: any) => !d.isRestDay && d.exercises.length > 0).map((d: any) => d.dayOfWeek);
      setWorkoutModalSelectedDays(new Set(days));
    } else {
      setWorkoutModalSelectedDays(new Set());
    }
  };

  const handleRegisterWorkoutSchedule = async () => {
    const plan = weekPlansData.find((p: any) => p.weekNumber === workoutModalWeek);
    const today = new Date();
    const workoutCategoryId = categories.find(c => c.name === '운동')?.id || categories[0]?.id || '';
    for (const dayOfWeek of Array.from(workoutModalSelectedDays).sort()) {
      const dayPlan = plan?.days.find((d: any) => d.dayOfWeek === dayOfWeek);
      const exercises: any[] = dayPlan?.exercises || [];
      const memo = exercises.map((ex: any) => `${ex.name} ${ex.sets.length}세트`).join('\n');
      const targetDate = getNextDateForDayOfWeek(dayOfWeek, today);
      const title = dayPlan?.routineName || `운동 - ${DAY_LABELS[dayOfWeek]}요일`;
      await addEvent({
        title,
        date: format(targetDate, 'yyyy-MM-dd'),
        startTime: workoutModalStartTime,
        endTime: workoutModalEndTime,
        categoryId: workoutCategoryId,
        memo,
      });
    }
    setShowWorkoutModal(false);
    toast.success(`${workoutModalSelectedDays.size}개의 운동 일정이 등록되었습니다`);
  };

  const openExistingEvent = (eventId: string, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setCurrentDate(date);
    }
    setSelectedEvent(eventId);
    setShowEventSheet(true);
  };

  // Drag handlers
  const handleDragStart = (event: CalendarEvent) => {
    setDraggingEvent(event);
  };

  const handleDragEnd = () => {
    if (draggingEvent && dragPreview) {
      const [hours, minutes] = draggingEvent.startTime.split(':').map(Number);
      const duration = hours * 60 + minutes;
      const newStartHour = dragPreview.hour;
      const newStartMinute = duration % 60;
      const newStartTime = `${String(newStartHour).padStart(2, '0')}:${String(newStartMinute).padStart(2, '0')}`;
      const newEndMinutes = newStartHour * 60 + newStartMinute + 60;
      const newEndTime = `${String(Math.floor(newEndMinutes / 60) % 24).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`;
      
      updateEvent(draggingEvent.id, {
        date: dragPreview.date,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }
    setDraggingEvent(null);
    setDragPreview(null);
  };

  const handleMonthDrop = (event: CalendarEvent, newDate: Date) => {
    const [hours, minutes] = event.startTime.split(':').map(Number);
    const duration = hours * 60 + minutes;
    const defaultHour = 9;
    const newStartMinute = duration % 60;
    const newStartTime = `${String(defaultHour).padStart(2, '0')}:${String(newStartMinute).padStart(2, '0')}`;
    const newEndMinutes = defaultHour * 60 + newStartMinute + 60;
    const newEndTime = `${String(Math.floor(newEndMinutes / 60) % 24).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`;
    
    updateEvent(event.id, {
      date: format(newDate, 'yyyy-MM-dd'),
      startTime: newStartTime,
      endTime: newEndTime,
    });
  };

  const getEventPosition = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;
    if (endMinutes <= startMinutes) endMinutes = startMinutes + 30;
    const duration = Math.max(30, endMinutes - startMinutes);
    return {
      top: (startMinutes / 60) * HOUR_HEIGHT,
      height: (duration / 60) * HOUR_HEIGHT,
    };
  };

  const renderMonthView = (expanded = false) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className={expanded ? '' : 'grid gap-2 md:gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'}>
        <div
          className={`rounded-xl md:rounded-[28px] border-0 md:border ${expanded ? 'p-2 md:p-6' : 'p-2 md:p-4'}`}
          style={{
            background: 'transparent',
            borderColor: theme.panelBorder,
            boxShadow: 'none',
          }}
        >
          <div className="mb-2 md:mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                Month View
              </div>
              <h3 className="mt-1 text-base md:text-lg font-semibold" style={{ color: theme.text }}>
                {format(currentDate, 'M월 일정')}
              </h3>
            </div>
            <button
              onClick={() => setIsMonthExpanded(current => !current)}
              className="flex items-center gap-1 md:gap-2 rounded-xl md:rounded-2xl px-2.5 md:px-3.5 py-1.5 md:py-2.5 text-xs md:text-sm font-semibold"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />}
              <span className="hidden md:inline">{expanded ? '축소' : '확대'}</span>
            </button>
          </div>

          <div className="mb-1 md:mb-2 grid grid-cols-7 gap-1 md:gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="py-1 md:py-2 text-center text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                {day}
              </div>
            ))}
          </div>

          <div
            className={`grid grid-cols-7 gap-1 md:gap-2 ${expanded ? '[grid-auto-rows:minmax(48px,1fr)]' : '[grid-auto-rows:minmax(36px,1fr)] md:[grid-auto-rows:minmax(92px,1fr)]'}`}
          >
            {days.map(day => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDateKey === format(day, 'yyyy-MM-dd');

              const handleDrop = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const eventData = e.dataTransfer.getData('text/plain');
                  if (eventData) {
                    const event = JSON.parse(eventData) as CalendarEvent;
                    handleMonthDrop(event, day);
                  }
                } catch (err) {
                  console.error('Drop error:', err);
                }
              };

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setCurrentDate(day);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={handleDrop}
                  className={`relative flex flex-col rounded-2xl border text-left transition-all ${expanded ? 'p-2.5' : 'p-1.5 md:p-2'}`}
                  style={{
                    background: isSelected ? theme.navActiveBackground : isCurrentMonth ? theme.panelBackgroundStrong : theme.navBackground,
                    borderColor: isCurrentDay ? theme.primary : theme.line,
                    color: isCurrentMonth ? theme.text : theme.textMuted,
                    minHeight: '70px',
                  }}
                >
                  <div className={`absolute left-2 top-2 font-semibold ${expanded ? 'text-sm' : 'text-[11px]'}`} style={{ color: isCurrentDay ? theme.primary : undefined }}>
                    {format(day, 'd')}
                  </div>

                  <div className={`${expanded ? 'mt-6 md:mt-9 flex flex-wrap gap-0.5' : 'mt-5 md:mt-6 flex flex-wrap gap-0.5'}`}>
                    {dayEvents.slice(0, 12).map(event => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          const eventData = JSON.stringify(event);
                          e.dataTransfer.setData('text/plain', eventData);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={e => {
                            e.stopPropagation();
                            openExistingEvent(event.id, day);
                        }}
                        className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="h-1.5 w-2 md:h-2 md:w-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(event.categoryId) }} />
                      </div>
                    ))}
                      {dayEvents.length > 12 && (
                      <div className="text-[9px] md:text-[10px] font-medium" style={{ color: theme.textMuted }}>
                        +{dayEvents.length - 12}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!expanded && (
          <div
            className="rounded-xl md:rounded-[28px] border-0 md:border p-2 md:p-5"
            style={{
              background: 'transparent',
              borderColor: theme.panelBorder,
              boxShadow: 'none',
            }}
          >
            <div className="mb-2 md:mb-4">
              <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                By Category
              </div>
              <h3 className="mt-1 text-base md:text-xl font-semibold" style={{ color: theme.text }}>
                {format(currentDate, 'M월 일정')}
              </h3>
            </div>

            <div className="space-y-4">
              {monthlyEventsByCategory.length === 0 ? (
                <div className="rounded-2xl border px-4 py-10 text-center text-sm" style={{ borderColor: theme.line, color: theme.textMuted }}>
                  이번 달 일정이 없습니다
                </div>
              ) : (
                monthlyEventsByCategory.map(category => (
                  <div key={category.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>
                        {category.emoji} {category.name}
                      </div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>
                        {category.items.length}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {category.items.slice(0, 6).map(event => (
                        <button
                          key={event.id}
                          onClick={() => openExistingEvent(event.id, new Date(event.date))}
                          className="flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left"
                          style={{ background: theme.navBackground, borderColor: theme.line }}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold" style={{ color: theme.text }}>
                              {event.title}
                            </div>
                            <div className="text-xs" style={{ color: theme.textMuted }}>
                              {format(new Date(event.date), 'M/d', { locale: ko })} · {event.startTime}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const totalHeight = HOUR_HEIGHT * 24;

    return (
      <div
        className="rounded-[28px] border p-3 md:p-4"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2">
              <div />
              {weekDays.map(day => (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setCurrentDate(day);
                    setSelectedDate(day);
                    setViewMode('day');
                  }}
                  className="rounded-2xl py-2 text-center transition-colors"
                  style={{ background: theme.navBackground }}
                >
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>
                    {format(day, 'E', { locale: ko })}
                  </div>
                  <div className="text-lg font-bold" style={{ color: isToday(day) ? theme.primary : theme.textSecondary }}>
                    {format(day, 'd')}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-[60px_repeat(7,1fr)] gap-2">
              <div className="relative" style={{ height: totalHeight }}>
                {hours.map(hour => (
                  <div key={hour} className="absolute left-0 right-0 border-t pr-2 text-right text-xs" style={{ top: hour * HOUR_HEIGHT, borderColor: theme.line, color: theme.textMuted }}>
                    <span className="relative -top-2 inline-block bg-transparent">{`${String(hour).padStart(2, '0')}:00`}</span>
                  </div>
                ))}
              </div>

              {weekDays.map(day => {
                const dayEvents = getEventsForDate(day);
                const dayKey = format(day, 'yyyy-MM-dd');
                const isDropTarget = draggingEvent && dragPreview?.date === dayKey;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative rounded-2xl border transition-colors ${isDropTarget ? 'border-dashed' : ''}`}
                    style={{ 
                      height: totalHeight, 
                      background: isDropTarget ? `${theme.primary}10` : theme.navBackground, 
                      borderColor: isDropTarget ? theme.primary : theme.line,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingEvent) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const hour = Math.floor(y / HOUR_HEIGHT);
                        setDragPreview({ date: dayKey, hour });
                      }
                    }}
                    onDragLeave={() => {
                      if (draggingEvent) {
                        setDragPreview({ date: dayKey, hour: 9 });
                      }
                    }}
                    onDrop={() => {
                      handleDragEnd();
                    }}
                  >
                    {hours.map(hour => (
                      <div key={hour} className="absolute left-0 right-0 border-t" style={{ top: hour * HOUR_HEIGHT, borderColor: theme.line }} />
                    ))}

                    {dragPreview && draggingEvent && dragPreview.date === dayKey && (
                      <div
                        className="absolute left-1.5 right-1.5 rounded-2xl border-2 border-dashed px-2.5 py-2"
                        style={{
                          top: dragPreview.hour * HOUR_HEIGHT + 2,
                          height: 60,
                          background: `${theme.primary}20`,
                          borderColor: theme.primary,
                        }}
                      >
                        <div className="text-xs font-medium" style={{ color: theme.primary }}>
                          {draggingEvent.title}
                        </div>
                        <div className="text-[10px]" style={{ color: theme.textMuted }}>
                          {`${String(dragPreview.hour).padStart(2, '0')}:00`}으로 이동
                        </div>
                      </div>
                    )}

                    {dayEvents.map(event => {
                      const category = categories.find(c => c.id === event.categoryId);
                      const position = getEventPosition(event.startTime, event.endTime);
                      const isDragging = draggingEvent?.id === event.id;
                      return (
                        <div
                          key={event.id}
                          draggable
                          onDragStart={() => handleDragStart(event)}
                          onDragEnd={() => handleDragEnd()}
                          onClick={() => !draggingEvent && openExistingEvent(event.id, day)}
                          className={`absolute left-1 right-1 overflow-hidden rounded-xl border px-2 py-1.5 text-left cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50 scale-95' : ''}`}
                          style={{
                            top: position.top + 2,
                            height: Math.max(position.height - 4, 40),
                            background: `linear-gradient(180deg, ${getCategoryColor(event.categoryId)}1F, ${getCategoryColor(event.categoryId)}14)`,
                            borderColor: `${getCategoryColor(event.categoryId)}55`,
                            boxShadow: `0 2px 8px ${getCategoryColor(event.categoryId)}20`,
                            color: theme.text,
                          }}
                        >
                          <div className="mb-0.5 flex items-center gap-1">
                            <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: getCategoryColor(event.categoryId) }} />
                            <div className="truncate text-[10px] font-semibold leading-tight">
                              {event.title}
                            </div>
                          </div>
                          <div className="text-[9px] leading-tight" style={{ color: theme.textSecondary }}>
                            {event.startTime}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const totalHeight = HOUR_HEIGHT * 24;

    return (
      <div
        className="rounded-xl md:rounded-[28px] border-0 md:border p-2 md:p-4"
        style={{
          background: 'transparent',
          borderColor: theme.panelBorder,
          boxShadow: 'none',
        }}
      >
        <div className="mb-1 md:mb-4 flex items-center justify-between">
          <h3 className="text-sm md:font-semibold" style={{ color: theme.text }}>
            {format(currentDate, 'M월 d일 (E)', { locale: ko })}
          </h3>
          <button
            onClick={() => setViewMode('week')}
            className="rounded-full px-2 py-1 text-[10px] md:text-xs font-semibold"
            style={{ background: theme.navBackground, color: theme.textSecondary }}
          >
            주간으로
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2 md:gap-3">
            <div className="relative" style={{ height: totalHeight }}>
              {hours.map(hour => (
                <div key={hour} className="absolute left-0 right-0 border-t pr-2 text-right text-xs" style={{ top: hour * HOUR_HEIGHT, borderColor: theme.line, color: theme.textMuted }}>
                  <span className="relative -top-2 inline-block bg-transparent">{`${String(hour).padStart(2, '0')}:00`}</span>
                </div>
              ))}
            </div>

            <div 
              className={`relative rounded-2xl border transition-colors ${draggingEvent ? 'border-dashed' : ''}`} 
              style={{ height: totalHeight, background: draggingEvent ? `${theme.primary}10` : theme.navBackground, borderColor: draggingEvent ? theme.primary : theme.line }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingEvent) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / HOUR_HEIGHT);
                  setDragPreview({ date: format(currentDate, 'yyyy-MM-dd'), hour });
                }
              }}
              onDrop={() => handleDragEnd()}
            >
              {hours.map(hour => (
                <div key={hour} className="absolute left-0 right-0 border-t" style={{ top: hour * HOUR_HEIGHT, borderColor: theme.line }} />
              ))}

              {dragPreview && draggingEvent && (
                <div
                  className="absolute left-2 right-2 rounded-2xl border-2 border-dashed px-3 py-2"
                  style={{
                    top: dragPreview.hour * HOUR_HEIGHT + 3,
                    height: 60,
                    background: `${theme.primary}20`,
                    borderColor: theme.primary,
                  }}
                >
                  <div className="text-sm font-medium" style={{ color: theme.primary }}>
                    {draggingEvent.title}
                  </div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    {`${String(dragPreview.hour).padStart(2, '0')}:00`}으로 이동
                  </div>
                </div>
              )}

              {dayEvents.map(event => {
                const category = categories.find(c => c.id === event.categoryId);
                const position = getEventPosition(event.startTime, event.endTime);
                const isDragging = draggingEvent?.id === event.id;
                return (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={() => handleDragStart(event)}
                    onDragEnd={() => handleDragEnd()}
                    onClick={() => !draggingEvent && openExistingEvent(event.id, currentDate)}
                    className={`absolute left-2 right-2 overflow-hidden rounded-2xl px-3 py-2 text-left cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50 scale-95' : ''}`}
                    style={{
                      top: position.top + 3,
                      height: Math.max(position.height - 6, 36),
                      backgroundColor: `${getCategoryColor(event.categoryId)}22`,
                      border: `1px solid ${getCategoryColor(event.categoryId)}55`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GripHorizontal className="h-4 w-4 shrink-0" style={{ color: getCategoryColor(event.categoryId) }} />
                      <div className="font-semibold" style={{ color: theme.text }}>
                        {category?.emoji} {event.title}
                      </div>
                    </div>
                    <div className="mt-1 text-sm" style={{ color: theme.textSecondary }}>
                      {event.startTime} - {event.endTime}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1240px] p-0 md:p-4">
      <div
        className="sticky top-1 z-20 mb-3 md:mb-4 flex flex-col justify-between gap-2 md:gap-4 rounded-2xl md:rounded-[28px] border px-3 py-3 md:px-4 md:py-4 md:top-2 md:flex-row md:items-center"
        style={{
          background: theme.panelBackgroundStrong,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={handlePrevious} className="rounded-xl md:rounded-2xl p-1.5 md:p-2 transition-transform duration-200 hover:translate-y-[-1px]" style={{ background: theme.navBackground, color: theme.textSecondary }}>
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <h2 className="text-base md:text-xl font-semibold" style={{ color: theme.text }}>
            {format(currentDate, viewMode === 'day' ? 'M월 d일' : 'yyyy년 M월', { locale: ko })}
          </h2>
          <button onClick={handleNext} className="rounded-xl md:rounded-2xl p-1.5 md:p-2 transition-transform duration-200 hover:translate-y-[-1px]" style={{ background: theme.navBackground, color: theme.textSecondary }}>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={handleToday} className="rounded-full px-2 py-0.5 text-xs md:text-sm font-semibold transition-transform duration-200 hover:translate-y-[-1px]" style={{ background: theme.navActiveBackground, color: theme.navActiveText }}>
            오늘
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl p-1" style={{ background: theme.navBackground }}>
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  if (mode === 'day' && selectedDate) setCurrentDate(selectedDate);
                }}
                className="rounded-xl px-3 py-1 text-sm font-medium transition-all duration-200"
                style={{
                  background: viewMode === mode ? theme.panelBackgroundStrong : 'transparent',
                  color: viewMode === mode ? theme.text : theme.textMuted,
                }}
              >
                {mode === 'month' ? '월간' : mode === 'week' ? '주간' : '일간'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowRepeatModal?.(true)}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 font-medium transition-transform duration-200 hover:translate-y-[-1px]"
            style={{ background: theme.navBackground, color: theme.textSecondary }}
          >
            <Repeat className="w-4 h-4" />
            <span className="hidden md:inline">반복</span>
            {repeatEvents.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold" style={{ background: theme.primary, color: '#fff' }}>
                {repeatEvents.length}
              </span>
            )}
          </button>

          <button
            onClick={openWorkoutModal}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 font-semibold transition-transform duration-200 hover:translate-y-[-1px]"
            style={{ background: theme.navBackground, color: theme.textSecondary }}
            title="헬스앱 운동계획으로 일정 등록"
          >
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">운동일정 등록</span>
          </button>

          <button
            onClick={() => openNewEvent(selectedDate || currentDate)}
            className="flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold transition-transform duration-200 hover:translate-y-[-1px]"
            style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">일정 추가</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {isMonthExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-4 top-24 z-40 overflow-y-auto rounded-[34px] border p-4 md:p-5"
            style={{
              background: theme.panelBackgroundStrong,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
            }}
          >
            {renderMonthView(true)}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEventSheet && (
          <EventSheet
            eventId={selectedEvent}
            initialDate={selectedDate || currentDate}
            onClose={() => {
              setShowEventSheet(false);
              setSelectedEvent(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* 운동일정 등록 모달 */}
      <AnimatePresence>
        {showWorkoutModal && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWorkoutModal(false)}
            />
            <motion.div
              className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-[28px] border p-5 sm:inset-x-auto sm:left-1/2 sm:w-[400px] sm:-translate-x-1/2"
              style={{ background: theme.panelBackgroundStrong, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}
              initial={{ opacity: 0, scale: 0.95, y: '-45%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: '-45%' }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" style={{ color: theme.primary }} />
                  <h3 className="text-base font-semibold" style={{ color: theme.text }}>운동일정 등록</h3>
                </div>
                <button onClick={() => setShowWorkoutModal(false)} className="rounded-full p-1.5" style={{ background: theme.navBackground, color: theme.textMuted }}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 주차 선택 */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>주차 선택</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(w => (
                    <button
                      key={w}
                      onClick={() => handleWorkoutWeekChange(w)}
                      className="flex-1 rounded-2xl py-2 text-sm font-semibold"
                      style={{
                        background: workoutModalWeek === w ? theme.navActiveBackground : theme.navBackground,
                        color: workoutModalWeek === w ? theme.navActiveText : theme.textMuted,
                      }}
                    >
                      {w}주차
                    </button>
                  ))}
                </div>
              </div>

              {/* 운동 요일 */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>운동 요일 (헬스앱 계획 기준 자동 선택)</label>
                <div className="flex gap-2">
                  {DAY_LABELS.map((label, idx) => {
                    const selected = workoutModalSelectedDays.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const next = new Set(workoutModalSelectedDays);
                          if (next.has(idx)) next.delete(idx); else next.add(idx);
                          setWorkoutModalSelectedDays(next);
                        }}
                        className="flex-1 rounded-2xl py-2 text-sm font-semibold"
                        style={{
                          background: selected ? theme.primary : theme.navBackground,
                          color: selected ? '#fff' : theme.textMuted,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 시간 선택 */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>시작 시간</label>
                  <input
                    type="time"
                    value={workoutModalStartTime}
                    onChange={e => setWorkoutModalStartTime(e.target.value)}
                    className="w-full rounded-2xl border px-3 py-2.5 text-sm"
                    style={{ background: theme.navBackground, color: theme.text, borderColor: theme.line }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>종료 시간</label>
                  <input
                    type="time"
                    value={workoutModalEndTime}
                    onChange={e => setWorkoutModalEndTime(e.target.value)}
                    className="w-full rounded-2xl border px-3 py-2.5 text-sm"
                    style={{ background: theme.navBackground, color: theme.text, borderColor: theme.line }}
                  />
                </div>
              </div>

              <p className="mb-4 text-xs" style={{ color: theme.textMuted }}>
                선택한 요일의 다음 날짜부터 캘린더에 운동 일정이 등록됩니다. 운동 기록 후 해당 일정 메모에 자동 추가됩니다.
              </p>

              <button
                onClick={handleRegisterWorkoutSchedule}
                disabled={workoutModalSelectedDays.size === 0}
                className="w-full rounded-2xl py-3 font-semibold disabled:opacity-40"
                style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
              >
                {workoutModalSelectedDays.size}개 운동 일정 등록
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
