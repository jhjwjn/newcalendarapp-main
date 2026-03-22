import React, { useMemo, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Repeat2, StickyNote, Tag, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from '../../lib/toast';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { Event } from '../../types/planner';

interface EventSheetProps {
  eventId: string | null;
  initialDate?: Date;
  onClose: () => void;
}

export function EventSheet({ eventId, initialDate, onClose }: EventSheetProps) {
  const { events, categories, addEvent, updateEvent, deleteEvent, settings } = usePlanner();
  const theme = getPlannerTheme(settings);
  const existingEvent = eventId ? events.find(e => e.id === eventId) : null;

  const initialCalendarDate = existingEvent?.date
    ? new Date(existingEvent.date)
    : initialDate || new Date();

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [date, setDate] = useState(existingEvent?.date || format(initialCalendarDate, 'yyyy-MM-dd'));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(initialCalendarDate));
  const [startTime, setStartTime] = useState(existingEvent?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingEvent?.endTime || '10:00');
  const [categoryId, setCategoryId] = useState(existingEvent?.categoryId || categories[0]?.id || '');
  const [memo, setMemo] = useState(existingEvent?.memo || '');
  const [repeat, setRepeat] = useState<Event['repeat']>(existingEvent?.repeat);
  const [enableRepeat, setEnableRepeat] = useState(Boolean(existingEvent?.repeat));

  const timeOptions = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const hours = String(Math.floor(index / 2)).padStart(2, '0');
        const minutes = index % 2 === 0 ? '00' : '30';
        return `${hours}:${minutes}`;
      }),
    [],
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const inputStyle = {
    background: theme.navBackground,
    color: theme.text,
    borderColor: theme.line,
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    const eventData = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      categoryId,
      memo: memo.trim(),
      repeat: enableRepeat ? repeat : undefined,
    };

    if (eventId) await updateEvent(eventId, eventData);
    else await addEvent(eventData);

    onClose();
  };

  const handleDelete = async () => {
    if (eventId && confirm('정말 삭제하시겠습니까?')) {
      await deleteEvent(eventId);
      onClose();
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" 
        onClick={onClose}
      />
      
      <motion.div
        className="fixed inset-0 z-50 overflow-y-auto rounded-t-3xl border-t border-x md:absolute md:inset-auto md:bottom-3 md:right-3 md:top-20 md:left-auto md:h-auto md:max-h-[calc(100vh-6rem)] md:w-[540px] md:max-w-[calc(100vw-1.5rem)] md:rounded-[30px] md:border md:overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: theme.panelBackgroundStrong,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <div className="sticky top-0 z-10 border-b px-4 py-3 md:px-5 md:py-4" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                Event Inspector
              </div>
              <h2 className="mt-1 text-xl font-semibold" style={{ color: theme.text }}>
                {eventId ? '일정 편집' : '일정 추가'}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-2xl p-2" style={{ background: theme.navBackground, color: theme.textSecondary }}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-[24px] border p-4" style={{ background: theme.panelBackground, borderColor: theme.line }}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 outline-none"
              style={inputStyle}
              placeholder="일정 제목"
            />
          </div>

          <div className="rounded-[24px] border p-4" style={{ background: theme.panelBackground, borderColor: theme.line }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                <CalendarDays className="h-4 w-4" />
                Date
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="rounded-xl p-2" style={{ background: theme.navBackground, color: theme.textSecondary }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-[110px] text-center text-sm font-semibold" style={{ color: theme.text }}>
                  {format(calendarMonth, 'yyyy년 M월', { locale: ko })}
                </div>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="rounded-xl p-2" style={{ background: theme.navBackground, color: theme.textSecondary }}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map(day => {
                const active = isSameDay(day, new Date(date));
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setDate(format(day, 'yyyy-MM-dd'))}
                    className="rounded-2xl px-2 py-2 text-sm font-medium transition-all"
                    style={{
                      background: active ? theme.navActiveBackground : isSameMonth(day, calendarMonth) ? theme.navBackground : theme.panelBackgroundStrong,
                      color: active ? theme.navActiveText : isToday(day) ? theme.primary : isSameMonth(day, calendarMonth) ? theme.text : theme.textMuted,
                      border: `1px solid ${active ? theme.primary : theme.line}`,
                    }}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border p-4" style={{ background: theme.panelBackground, borderColor: theme.line }}>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              <Clock3 className="h-4 w-4" />
              Time
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: theme.textMuted }}>
                  시작
                </label>
                <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full rounded-2xl border px-4 py-3 text-base outline-none" style={inputStyle}>
                  {timeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: theme.textMuted }}>
                  종료
                </label>
                <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full rounded-2xl border px-4 py-3 text-base outline-none" style={inputStyle}>
                  {timeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border p-4" style={{ background: theme.panelBackground, borderColor: theme.line }}>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              <Tag className="h-4 w-4" />
              Category
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(category => {
                const selected = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className="flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all"
                    style={{
                      borderColor: selected ? category.color : theme.line,
                      background: selected ? `${category.color}18` : theme.navBackground,
                      color: selected ? category.color : theme.textSecondary,
                    }}
                  >
                    <span className="text-lg">{category.emoji}</span>
                    <span className="text-sm font-semibold">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border p-4" style={{ background: theme.panelBackground, borderColor: theme.line }}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              <StickyNote className="h-4 w-4" />
              Memo
            </div>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full resize-none rounded-2xl border px-4 py-3 outline-none"
              style={inputStyle}
              rows={5}
              placeholder="메모 (선택사항)"
            />
          </div>

          <div className="rounded-[24px] border p-4" style={{ background: theme.panelBackground, borderColor: theme.line }}>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              <Repeat2 className="h-4 w-4" />
              Repeat
            </div>
            <label className="mb-3 flex items-center gap-3 text-sm" style={{ color: theme.textSecondary }}>
              <input type="checkbox" checked={enableRepeat} onChange={e => setEnableRepeat(e.target.checked)} />
              반복 일정으로 저장
            </label>
            {enableRepeat && (
              <select
                value={repeat || 'daily'}
                onChange={e => setRepeat(e.target.value as Event['repeat'])}
                className="w-full rounded-2xl border px-4 py-3 text-base outline-none"
                style={inputStyle}
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="biweekly">격주</option>
                <option value="monthly">매월</option>
              </select>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t px-5 py-4" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
          {eventId && (
            <button onClick={handleDelete} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-medium" style={{ background: `${theme.accent1}18`, color: theme.accent1 }}>
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-2xl px-4 py-3 font-medium" style={{ background: theme.navBackground, color: theme.textSecondary }}>
            취소
          </button>
          <button onClick={handleSave} className="rounded-2xl px-4 py-3 font-semibold" style={{ background: theme.navActiveBackground, color: theme.navActiveText }}>
            저장
          </button>
        </div>
      </motion.div>
    </>
  );
}
