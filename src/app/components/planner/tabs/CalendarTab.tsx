import React, { useMemo, useState, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, GripVertical, GripHorizontal, Repeat, X, Trash2, Edit2, Dumbbell, Heart, CalendarDays, Clock } from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { EventSheet } from '../EventSheet';
import { CalendarEvent } from '../../../types/planner';
import { toast } from '../../../lib/toast';
import { getMyConnection, fetchPartnerEvents } from '../../../lib/partnerCalendar';

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

type RightPanelMode = 'default' | 'detail' | 'new-event' | 'edit-event' | 'workout';

export function CalendarTab({ showRepeatModal = false, setShowRepeatModal }: CalendarTabProps = {}) {
  const { events, categories, settings, updateEvent, addEvent, deleteEvent, user } = usePlanner();
  const theme = getPlannerTheme(settings);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventSheet, setShowEventSheet] = useState(false);
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);

  // 우측 패널 (월간뷰 전용)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('default');
  const [rightPanelEventId, setRightPanelEventId] = useState<string | null>(null);
  // 인라인 이벤트 폼 state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formMemo, setFormMemo] = useState('');

  // 파트너 일정
  const [partnerEvents, setPartnerEvents] = useState<CalendarEvent[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<'both' | 'mine' | 'partner'>('both');
  useEffect(() => {
    if (!user) return;
    getMyConnection(user.id).then(async conn => {
      if (conn?.status !== 'active') return;
      const partnerId = conn.userId === user.id ? conn.partnerId : conn.userId;
      if (!partnerId) return;
      const ym = format(currentDate, 'yyyy-MM');
      const pEvents = await fetchPartnerEvents(user.id, partnerId, ym);
      setPartnerEvents(pEvents);
    });
  }, [user, currentDate]);

  const hasPartner = partnerEvents.length > 0;

  // 운동일정 등록 모달
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutModalWeek, setWorkoutModalWeek] = useState(1);
  const [workoutModalSelectedDays, setWorkoutModalSelectedDays] = useState<Set<number>>(new Set());
  const [workoutModalDayTimes, setWorkoutModalDayTimes] = useState<Record<number, { startTime: string; endTime: string }>>({});
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
    const targetDate = date || selectedDate || currentDate;
    if (date) {
      setSelectedDate(date);
      setCurrentDate(date);
    }
    if (viewMode === 'month') {
      setFormTitle('');
      setFormDate(format(targetDate, 'yyyy-MM-dd'));
      setFormStartTime('09:00');
      setFormEndTime('10:00');
      setFormCategoryId(categories[0]?.id || '');
      setFormMemo('');
      setRightPanelEventId(null);
      setRightPanelMode('new-event');
    } else {
      setSelectedEvent(null);
      setShowEventSheet(true);
    }
  };

  const openEditEvent = (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    setFormTitle(ev.title);
    setFormDate(ev.date);
    setFormStartTime(ev.startTime);
    setFormEndTime(ev.endTime);
    setFormCategoryId(ev.categoryId);
    setFormMemo(ev.memo || '');
    setRightPanelEventId(eventId);
    setRightPanelMode('edit-event');
  };

  const handleFormSave = async () => {
    if (!formTitle.trim()) { toast.error('제목을 입력해주세요'); return; }
    if (rightPanelMode === 'edit-event' && rightPanelEventId) {
      await updateEvent(rightPanelEventId, { title: formTitle.trim(), date: formDate, startTime: formStartTime, endTime: formEndTime, categoryId: formCategoryId, memo: formMemo.trim() });
      toast.success('일정이 수정되었습니다');
    } else {
      await addEvent({ title: formTitle.trim(), date: formDate, startTime: formStartTime, endTime: formEndTime, categoryId: formCategoryId, memo: formMemo.trim() });
      toast.success('일정이 추가되었습니다');
    }
    setRightPanelMode('default');
    setRightPanelEventId(null);
  };

  const handleFormDelete = async () => {
    if (!rightPanelEventId) return;
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteEvent(rightPanelEventId);
      toast.success('일정이 삭제되었습니다');
      setRightPanelMode('default');
      setRightPanelEventId(null);
    }
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
        const times: Record<number, { startTime: string; endTime: string }> = {};
        days.forEach((d: number) => { times[d] = { startTime: '07:00', endTime: '08:00' }; });
        setWorkoutModalDayTimes(times);
      } else {
        setWorkoutModalSelectedDays(new Set());
        setWorkoutModalDayTimes({});
      }
    } catch {
      setWeekPlansData([]);
      setWorkoutModalSelectedDays(new Set());
      setWorkoutModalDayTimes({});
    }
    setWorkoutModalWeek(1);
    if (viewMode === 'month') {
      setRightPanelMode('workout');
    } else {
      setShowWorkoutModal(true);
    }
  };

  const handleWorkoutWeekChange = (weekNum: number) => {
    setWorkoutModalWeek(weekNum);
    const plan = weekPlansData.find((p: any) => p.weekNumber === weekNum);
    if (plan) {
      const days = plan.days.filter((d: any) => !d.isRestDay && d.exercises.length > 0).map((d: any) => d.dayOfWeek);
      setWorkoutModalSelectedDays(new Set(days));
      const times: Record<number, { startTime: string; endTime: string }> = {};
      days.forEach((d: number) => { times[d] = workoutModalDayTimes[d] || { startTime: '07:00', endTime: '08:00' }; });
      setWorkoutModalDayTimes(times);
    } else {
      setWorkoutModalSelectedDays(new Set());
      setWorkoutModalDayTimes({});
    }
  };

  const handleRegisterWorkoutSchedule = async () => {
    const plan = weekPlansData.find((p: any) => p.weekNumber === workoutModalWeek);
    const today = new Date();
    const workoutCategoryId = categories.find(c => c.name === '운동')?.id || categories[0]?.id || '';
    for (const dayOfWeek of Array.from(workoutModalSelectedDays).sort()) {
      const dayPlan = plan?.days.find((d: any) => d.dayOfWeek === dayOfWeek);
      const times = workoutModalDayTimes[dayOfWeek] || { startTime: '07:00', endTime: '08:00' };
      const targetDate = getNextDateForDayOfWeek(dayOfWeek, today);
      const title = dayPlan?.routineName || `운동 - ${DAY_LABELS[dayOfWeek]}요일`;
      await addEvent({
        title,
        date: format(targetDate, 'yyyy-MM-dd'),
        startTime: times.startTime,
        endTime: times.endTime,
        categoryId: workoutCategoryId,
        memo: '',
      });
    }
    setShowWorkoutModal(false);
    setRightPanelMode('default');
    toast.success(`${workoutModalSelectedDays.size}개의 운동 일정이 등록되었습니다`);
  };

  const openExistingEvent = (eventId: string, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setCurrentDate(date);
    }
    if (viewMode === 'month') {
      setRightPanelEventId(eventId);
      setRightPanelMode('detail');
    } else {
      setSelectedEvent(eventId);
      setShowEventSheet(true);
    }
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
                    {calendarFilter !== 'partner' && dayEvents.slice(0, 10).map(event => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          const eventData = JSON.stringify(event);
                          e.dataTransfer.setData('text/plain', eventData);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={(e) => { e.stopPropagation(); }}
                        onClick={e => { e.stopPropagation(); openExistingEvent(event.id, day); }}
                        className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="h-1.5 w-2 md:h-2 md:w-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(event.categoryId) }} />
                      </div>
                    ))}
                    {/* 파트너 일정 */}
                    {calendarFilter !== 'mine' && partnerEvents
                      .filter(e => e.date === format(day, 'yyyy-MM-dd'))
                      .slice(0, calendarFilter === 'partner' ? 10 : 3)
                      .map(e => (
                        <div
                          key={`p-${e.id}`}
                          title={`💑 ${e.title}`}
                          onClick={ev => { ev.stopPropagation(); }}
                          className="h-1.5 w-2 md:h-2 md:w-2.5 rounded-full shrink-0 cursor-default"
                          style={{ backgroundColor: '#f43f5e' }}
                        />
                      ))}
                    {calendarFilter !== 'partner' && dayEvents.length > 10 && (
                      <div className="text-[9px] md:text-[10px] font-medium" style={{ color: theme.textMuted }}>
                        +{dayEvents.length - 10}
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
            className="rounded-xl md:rounded-[28px] border-0 md:border overflow-hidden"
            style={{
              background: theme.panelBackgroundStrong,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
              minHeight: '400px',
            }}
          >
            <AnimatePresence mode="wait">
              {/* ── 기본 카테고리 뷰 ── */}
              {rightPanelMode === 'default' && (
                <motion.div
                  key="default"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="p-4 md:p-5 h-full overflow-y-auto"
                >
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                      {calendarFilter === 'partner' ? 'Partner Calendar' : 'By Category'}
                    </div>
                    <h3 className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                      {format(currentDate, 'M월 일정')}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {calendarFilter === 'partner' ? (
                      // 파트너 일정 표시
                      partnerEvents.length === 0 ? (
                        <div className="rounded-2xl border px-4 py-10 text-center text-sm" style={{ borderColor: theme.line, color: theme.textMuted }}>
                          파트너 일정이 없습니다
                        </div>
                      ) : (
                        partnerEvents
                          .filter(e => e.date.startsWith(format(currentDate, 'yyyy-MM')))
                          .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
                          .slice(0, 10)
                          .map(event => (
                            <div
                              key={event.id}
                              className="flex w-full items-center justify-between rounded-2xl border px-3 py-2"
                              style={{ background: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.2)' }}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold" style={{ color: theme.text }}>
                                  💑 {event.title}
                                </div>
                                <div className="text-xs" style={{ color: theme.textMuted }}>
                                  {format(new Date(event.date), 'M/d (E)', { locale: ko })} · {event.startTime}
                                </div>
                              </div>
                            </div>
                          ))
                      )
                    ) : (
                      // 내 일정 카테고리별 표시
                      monthlyEventsByCategory.length === 0 ? (
                        <div className="rounded-2xl border px-4 py-10 text-center text-sm" style={{ borderColor: theme.line, color: theme.textMuted }}>
                          이번 달 일정이 없습니다
                        </div>
                      ) : (
                        monthlyEventsByCategory.map(category => (
                          <div key={category.id}>
                            <div className="mb-1.5 flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                              <div className="text-xs font-semibold" style={{ color: theme.text }}>
                                {category.emoji} {category.name}
                              </div>
                              <div className="text-xs" style={{ color: theme.textMuted }}>
                                {category.items.length}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {category.items.slice(0, 5).map(event => (
                                <button
                                  key={event.id}
                                  onClick={() => openExistingEvent(event.id, new Date(event.date))}
                                  className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all hover:scale-[1.01]"
                                  style={{ background: theme.navBackground, borderColor: theme.line }}
                                >
                                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold" style={{ color: theme.text }}>
                                      {event.title}
                                    </div>
                                    <div className="text-[10px]" style={{ color: theme.textMuted }}>
                                      {format(new Date(event.date), 'M/d', { locale: ko })} · {event.startTime}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── 이벤트 세부정보 ── */}
              {rightPanelMode === 'detail' && rightPanelEventId && (() => {
                const ev = events.find(e => e.id === rightPanelEventId);
                const cat = ev ? categories.find(c => c.id === ev.categoryId) : null;
                if (!ev) return null;
                return (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col h-full"
                  >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.panelBorder }}>
                      <button
                        onClick={() => setRightPanelMode('default')}
                        className="flex items-center gap-1 text-xs font-semibold"
                        style={{ color: theme.textMuted }}
                      >
                        <ChevronLeft className="h-4 w-4" /> 목록
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditEvent(rightPanelEventId)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                          style={{ background: `${theme.primary}18`, color: theme.primary }}
                        >
                          <Edit2 className="h-3.5 w-3.5 inline mr-1" />편집
                        </button>
                        <button
                          onClick={handleFormDelete}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                        >
                          <Trash2 className="h-3.5 w-3.5 inline mr-1" />삭제
                        </button>
                      </div>
                    </div>
                    {/* 내용 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* 카테고리 배지 */}
                      {cat && (
                        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${cat.color}20`, color: cat.color }}>
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.emoji} {cat.name}
                        </div>
                      )}
                      {/* 제목 */}
                      <h2 className="text-xl font-black leading-tight" style={{ color: theme.text }}>{ev.title}</h2>
                      {/* 날짜/시간 */}
                      <div className="rounded-2xl p-3 space-y-2" style={{ background: theme.navBackground }}>
                        <div className="flex items-center gap-2 text-sm" style={{ color: theme.textSecondary }}>
                          <CalendarDays className="h-4 w-4 shrink-0" style={{ color: theme.primary }} />
                          {format(new Date(ev.date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                        </div>
                        <div className="flex items-center gap-2 text-sm" style={{ color: theme.textSecondary }}>
                          <Clock className="h-4 w-4 shrink-0" style={{ color: theme.primary }} />
                          {ev.startTime} – {ev.endTime}
                        </div>
                      </div>
                      {/* 메모 */}
                      {ev.memo && (
                        <div className="rounded-2xl p-3" style={{ background: theme.navBackground }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>메모</p>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>{ev.memo}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })()}

              {/* ── 이벤트 추가/편집 폼 ── */}
              {(rightPanelMode === 'new-event' || rightPanelMode === 'edit-event') && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col h-full"
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.panelBorder }}>
                    <button
                      onClick={() => setRightPanelMode('default')}
                      className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: theme.textMuted }}
                    >
                      <ChevronLeft className="h-4 w-4" /> 취소
                    </button>
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      {rightPanelMode === 'edit-event' ? '일정 편집' : '일정 추가'}
                    </span>
                    <button
                      onClick={handleFormSave}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.primary})` }}
                    >
                      저장
                    </button>
                  </div>
                  {/* 폼 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* 제목 */}
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="일정 제목"
                      className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none"
                      style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                      autoFocus
                    />
                    {/* 날짜 */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: theme.navBackground, borderColor: theme.line }}>
                      <div className="px-3 py-2 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" style={{ color: theme.primary }} />
                        <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>날짜</span>
                      </div>
                      <input
                        type="date"
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        className="w-full px-3 pb-3 text-sm outline-none"
                        style={{ background: 'transparent', color: theme.text }}
                      />
                    </div>
                    {/* 시간 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border px-3 py-2" style={{ background: theme.navBackground, borderColor: theme.line }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: theme.textMuted }}>시작</p>
                        <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className="w-full text-sm outline-none" style={{ background: 'transparent', color: theme.text }} />
                      </div>
                      <div className="rounded-2xl border px-3 py-2" style={{ background: theme.navBackground, borderColor: theme.line }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: theme.textMuted }}>종료</p>
                        <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} className="w-full text-sm outline-none" style={{ background: 'transparent', color: theme.text }} />
                      </div>
                    </div>
                    {/* 카테고리 */}
                    <div className="rounded-2xl border p-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: theme.textMuted }}>카테고리</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setFormCategoryId(cat.id)}
                            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border-2 transition-all"
                            style={{
                              background: formCategoryId === cat.id ? `${cat.color}20` : 'transparent',
                              borderColor: formCategoryId === cat.id ? cat.color : theme.line,
                              color: formCategoryId === cat.id ? cat.color : theme.textMuted,
                            }}
                          >
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.emoji} {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 메모 */}
                    <textarea
                      value={formMemo}
                      onChange={e => setFormMemo(e.target.value)}
                      placeholder="메모 (선택)"
                      rows={3}
                      className="w-full rounded-2xl border px-3 py-2.5 text-sm outline-none resize-none"
                      style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                    />
                    {/* 편집 시 삭제 버튼 */}
                    {rightPanelMode === 'edit-event' && (
                      <button
                        onClick={handleFormDelete}
                        className="w-full rounded-2xl py-2.5 text-sm font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                      >
                        <Trash2 className="h-4 w-4 inline mr-2" />일정 삭제
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── 운동일정 등록 ── */}
              {rightPanelMode === 'workout' && (
                <motion.div
                  key="workout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col h-full"
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.panelBorder }}>
                    <button
                      onClick={() => setRightPanelMode('default')}
                      className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: theme.textMuted }}
                    >
                      <ChevronLeft className="h-4 w-4" /> 취소
                    </button>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" style={{ color: theme.primary }} />
                      <span className="text-sm font-bold" style={{ color: theme.text }}>운동일정 등록</span>
                    </div>
                    <div className="w-12" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 주차 선택 */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>주차 선택</label>
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
                    {/* 요일별 시간 설정 */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>요일별 시간 설정</label>
                      <div className="space-y-2">
                        {DAY_LABELS.map((label, idx) => {
                          const selected = workoutModalSelectedDays.has(idx);
                          const times = workoutModalDayTimes[idx] || { startTime: '07:00', endTime: '08:00' };
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const next = new Set(workoutModalSelectedDays);
                                  if (next.has(idx)) {
                                    next.delete(idx);
                                  } else {
                                    next.add(idx);
                                    if (!workoutModalDayTimes[idx]) {
                                      setWorkoutModalDayTimes(prev => ({ ...prev, [idx]: { startTime: '07:00', endTime: '08:00' } }));
                                    }
                                  }
                                  setWorkoutModalSelectedDays(next);
                                }}
                                className="flex items-center gap-2 shrink-0"
                              >
                                <div
                                  className="h-5 w-5 rounded-md flex items-center justify-center border-2 transition-all"
                                  style={{ background: selected ? theme.primary : 'transparent', borderColor: selected ? theme.primary : theme.line }}
                                >
                                  {selected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="text-sm font-bold w-4" style={{ color: selected ? theme.text : theme.textMuted }}>{label}</span>
                              </button>
                              <input type="time" value={times.startTime} onChange={e => setWorkoutModalDayTimes(prev => ({ ...prev, [idx]: { ...times, startTime: e.target.value } }))} disabled={!selected}
                                className="flex-1 rounded-xl border px-2 py-1.5 text-xs"
                                style={{ background: selected ? theme.navBackground : theme.line, color: selected ? theme.text : theme.textMuted, borderColor: theme.line, opacity: selected ? 1 : 0.5 }}
                              />
                              <span className="text-xs shrink-0" style={{ color: theme.textMuted }}>~</span>
                              <input type="time" value={times.endTime} onChange={e => setWorkoutModalDayTimes(prev => ({ ...prev, [idx]: { ...times, endTime: e.target.value } }))} disabled={!selected}
                                className="flex-1 rounded-xl border px-2 py-1.5 text-xs"
                                style={{ background: selected ? theme.navBackground : theme.line, color: selected ? theme.text : theme.textMuted, borderColor: theme.line, opacity: selected ? 1 : 0.5 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      선택한 요일의 다음 날짜부터 캘린더에 운동 일정이 등록됩니다.
                    </p>
                    <button
                      onClick={handleRegisterWorkoutSchedule}
                      disabled={workoutModalSelectedDays.size === 0}
                      className="w-full rounded-2xl py-3 font-semibold disabled:opacity-40"
                      style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
                    >
                      {workoutModalSelectedDays.size}개 운동 일정 등록
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

          {/* 파트너 캘린더 필터 (파트너 연결된 경우) */}
          {hasPartner && (
            <div className="flex rounded-2xl p-1 gap-0.5" style={{ background: theme.navBackground }}>
              {([
                { id: 'both', label: '전체', icon: null },
                { id: 'mine', label: '내 일정', icon: null },
                { id: 'partner', label: <><Heart className="w-3 h-3 inline" /> 파트너</>, icon: null },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCalendarFilter(opt.id);
                    if (opt.id !== 'partner') setRightPanelMode('default');
                    else setRightPanelMode('default');
                  }}
                  className="rounded-xl px-2.5 py-1 text-xs font-semibold transition-all"
                  style={{
                    background: calendarFilter === opt.id ? (opt.id === 'partner' ? '#f43f5e20' : theme.panelBackgroundStrong) : 'transparent',
                    color: calendarFilter === opt.id ? (opt.id === 'partner' ? '#f43f5e' : theme.text) : theme.textMuted,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={openWorkoutModal}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 font-semibold transition-transform duration-200 hover:translate-y-[-1px]"
            style={{
              background: rightPanelMode === 'workout' ? `${theme.primary}18` : theme.navBackground,
              color: rightPanelMode === 'workout' ? theme.primary : theme.textSecondary,
            }}
            title="헬스앱 운동계획으로 일정 등록"
          >
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">운동일정</span>
          </button>

          <button
            onClick={() => openNewEvent(selectedDate || currentDate)}
            className="flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold transition-transform duration-200 hover:translate-y-[-1px]"
            style={{
              background: (rightPanelMode === 'new-event' || rightPanelMode === 'edit-event') ? `${theme.primary}18` : theme.navActiveBackground,
              color: (rightPanelMode === 'new-event' || rightPanelMode === 'edit-event') ? theme.primary : theme.navActiveText,
            }}
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
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWorkoutModal(false)}
            />
            <motion.div
              className="fixed inset-x-4 top-[5%] z-50 mx-auto max-h-[88vh] max-w-[440px] overflow-y-auto rounded-[28px] border p-5 sm:left-0 sm:right-0"
              style={{ background: theme.panelBackgroundStrong, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
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

              {/* 요일별 시간 설정 */}
              <div className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>요일별 운동 시간 설정</label>
                <div className="space-y-2">
                  {DAY_LABELS.map((label, idx) => {
                    const selected = workoutModalSelectedDays.has(idx);
                    const times = workoutModalDayTimes[idx] || { startTime: '07:00', endTime: '08:00' };
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const next = new Set(workoutModalSelectedDays);
                            if (next.has(idx)) {
                              next.delete(idx);
                            } else {
                              next.add(idx);
                              if (!workoutModalDayTimes[idx]) {
                                setWorkoutModalDayTimes(prev => ({ ...prev, [idx]: { startTime: '07:00', endTime: '08:00' } }));
                              }
                            }
                            setWorkoutModalSelectedDays(next);
                          }}
                          className="flex items-center gap-2 shrink-0"
                        >
                          <div
                            className="h-5 w-5 rounded-md flex items-center justify-center transition-all border-2"
                            style={{
                              background: selected ? theme.primary : 'transparent',
                              borderColor: selected ? theme.primary : theme.line,
                            }}
                          >
                            {selected && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-bold w-5 text-center" style={{ color: selected ? theme.text : theme.textMuted }}>
                            {label}
                          </span>
                        </button>
                        <input
                          type="time"
                          value={times.startTime}
                          onChange={e => setWorkoutModalDayTimes(prev => ({ ...prev, [idx]: { ...times, startTime: e.target.value } }))}
                          disabled={!selected}
                          className="flex-1 rounded-xl border px-2 py-1.5 text-xs transition-all"
                          style={{
                            background: selected ? theme.navBackground : theme.line,
                            color: selected ? theme.text : theme.textMuted,
                            borderColor: theme.line,
                            opacity: selected ? 1 : 0.5,
                            cursor: selected ? 'default' : 'not-allowed',
                          }}
                        />
                        <span className="text-xs shrink-0" style={{ color: theme.textMuted }}>~</span>
                        <input
                          type="time"
                          value={times.endTime}
                          onChange={e => setWorkoutModalDayTimes(prev => ({ ...prev, [idx]: { ...times, endTime: e.target.value } }))}
                          disabled={!selected}
                          className="flex-1 rounded-xl border px-2 py-1.5 text-xs transition-all"
                          style={{
                            background: selected ? theme.navBackground : theme.line,
                            color: selected ? theme.text : theme.textMuted,
                            borderColor: theme.line,
                            opacity: selected ? 1 : 0.5,
                            cursor: selected ? 'default' : 'not-allowed',
                          }}
                        />
                      </div>
                    );
                  })}
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
