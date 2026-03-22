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
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, GripVertical, GripHorizontal, Repeat, X, Trash2, Edit2 } from 'lucide-react';
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

export function CalendarTab({ showRepeatModal = false, setShowRepeatModal }: CalendarTabProps) {
  const { events, categories, settings, updateEvent } = usePlanner();
  const theme = getPlannerTheme(settings);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventSheet, setShowEventSheet] = useState(false);
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);
  
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
      <div className={expanded ? '' : 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'}>
        <div
          className={`rounded-[28px] border ${expanded ? 'p-5 md:p-6' : 'p-3 md:p-4'}`}
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                Month View
              </div>
              <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.text }}>
                {format(currentDate, 'M월 일정')}
              </h3>
            </div>
            <button
              onClick={() => setIsMonthExpanded(current => !current)}
              className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {expanded ? '축소' : '확대'}
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                {day}
              </div>
            ))}
          </div>

          <div
            className={`grid grid-cols-7 gap-2 ${expanded ? '[grid-auto-rows:minmax(128px,1fr)]' : '[grid-auto-rows:minmax(84px,1fr)] md:[grid-auto-rows:minmax(92px,1fr)]'}`}
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
                  }}
                >
                  <div className={`absolute left-2 top-2 font-semibold ${expanded ? 'text-sm' : 'text-[11px]'}`} style={{ color: isCurrentDay ? theme.primary : undefined }}>
                    {format(day, 'd')}
                  </div>

                  <div className={`${expanded ? 'mt-7 space-y-1.5' : 'mt-4 space-y-1'}`}>
                    {dayEvents.slice(0, expanded ? 5 : 3).map(event => (
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
                          if (!e.dataTransfer.types.includes('text/plain')) {
                            e.stopPropagation();
                            openExistingEvent(event.id, day);
                          }
                        }}
                        className={`flex items-center gap-1 w-full truncate rounded-lg px-1.5 py-1 text-left font-medium cursor-grab active:cursor-grabbing ${expanded ? 'text-xs' : 'text-[10px]'}`}
                        style={{
                          backgroundColor: `${getCategoryColor(event.categoryId)}20`,
                          color: getCategoryColor(event.categoryId),
                        }}
                      >
                        <GripHorizontal className="h-2.5 w-2.5 shrink-0" />
                        {event.title}
                      </div>
                    ))}
                      {dayEvents.length > (expanded ? 5 : 3) && (
                      <div className="px-1 text-[10px] font-medium" style={{ color: theme.textMuted }}>
                        +{dayEvents.length - (expanded ? 5 : 3)} more
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
            className="rounded-[28px] border p-5"
            style={{
              background: theme.panelBackground,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
            }}
          >
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                By Category
              </div>
              <h3 className="mt-1 text-xl font-semibold" style={{ color: theme.text }}>
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
        className="rounded-[28px] border p-4"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: theme.text }}>
            {format(currentDate, 'M월 d일 (E)', { locale: ko })}
          </h3>
          <button
            onClick={() => setViewMode('week')}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: theme.navBackground, color: theme.textSecondary }}
          >
            주간으로
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
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
    <div className="mx-auto max-w-[1240px] p-3 md:p-4">
      <div
        className="sticky top-1 z-20 mb-4 flex flex-col justify-between gap-4 rounded-[28px] border px-4 py-4 md:top-2 md:flex-row md:items-center"
        style={{
          background: theme.panelBackgroundStrong,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={handlePrevious} className="rounded-2xl p-2 transition-transform duration-200 hover:translate-y-[-1px]" style={{ background: theme.navBackground, color: theme.textSecondary }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
            {format(currentDate, viewMode === 'day' ? 'yyyy년 M월 d일' : 'yyyy년 M월', { locale: ko })}
          </h2>
          <button onClick={handleNext} className="rounded-2xl p-2 transition-transform duration-200 hover:translate-y-[-1px]" style={{ background: theme.navBackground, color: theme.textSecondary }}>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={handleToday} className="rounded-full px-3 py-1 text-sm font-semibold transition-transform duration-200 hover:translate-y-[-1px]" style={{ background: theme.navActiveBackground, color: theme.navActiveText }}>
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
    </div>
  );
}
