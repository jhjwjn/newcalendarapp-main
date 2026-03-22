import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Repeat, X, Trash2 } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { CalendarEvent } from '../../types/planner';
import { toast } from '../../lib/toast';

interface RepeatScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REPEAT_OPTIONS = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'biweekly', label: '격주' },
  { value: 'monthly', label: '매월' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
];

export function RepeatScheduleModal({ isOpen, onClose }: RepeatScheduleModalProps) {
  const { events, categories, settings, updateEvent, deleteEvent } = usePlanner();
  const theme = getPlannerTheme(settings);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    repeat: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
    startTime: '09:00',
    repeatDays: [] as number[],
  });

  const repeatEvents = useMemo(() => {
    return events.filter(e => e.repeat && e.repeat !== 'none');
  }, [events]);

  const getCategoryColor = (categoryId: string) => categories.find(c => c.id === categoryId)?.color || '#6b7280';

  const handleEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setEditForm({
      repeat: (event.repeat as any) || 'weekly',
      startTime: event.startTime,
      repeatDays: event.repeatDays || [],
    });
  };

  const handleSave = async (event: CalendarEvent) => {
    await updateEvent(event.id, {
      repeat: editForm.repeat,
      startTime: editForm.startTime,
      repeatDays: editForm.repeatDays,
    });
    setEditingId(null);
    toast.success('반복 일정이 수정되었어요');
  };

  const handleDelete = async (eventId: string) => {
    await deleteEvent(eventId);
    toast.success('반복 일정이 삭제되었어요');
  };

  const handleDayToggle = (day: number) => {
    setEditForm(prev => ({
      ...prev,
      repeatDays: prev.repeatDays.includes(day)
        ? prev.repeatDays.filter(d => d !== day)
        : [...prev.repeatDays, day]
    }));
  };

  const getRepeatLabel = (repeat: string) => {
    return REPEAT_OPTIONS.find(o => o.value === repeat)?.label || repeat;
  };

  const getDaysLabel = (days: number[]) => {
    if (days.length === 0) return '';
    const dayLabels = days.sort().map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).join(', ');
    return `(${dayLabels})`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="w-full max-w-md rounded-3xl border shadow-2xl"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b p-4" style={{ borderColor: theme.line }}>
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5" style={{ color: theme.primary }} />
                <h3 className="font-semibold" style={{ color: theme.text }}>반복 일정 관리</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1"
                style={{ background: theme.navBackground }}
              >
                <X className="h-5 w-5" style={{ color: theme.textMuted }} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {repeatEvents.length === 0 ? (
                <div className="py-12 text-center">
                  <Repeat className="mx-auto mb-3 h-12 w-12" style={{ color: theme.textMuted }} />
                  <p className="text-base" style={{ color: theme.textMuted }}>반복 일정이 없어요</p>
                  <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                    일정 수정에서 반복 옵션을 선택하면 여기서 관리할 수 있어요
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {repeatEvents.map(event => {
                    const category = categories.find(c => c.id === event.categoryId);
                    const isEditing = editingId === event.id;

                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl border p-4"
                        style={{
                          background: theme.navBackground,
                          borderColor: isEditing ? theme.primary : theme.line
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-xs font-medium" style={{ color: theme.textMuted }}>반복 단위</label>
                              <div className="grid grid-cols-2 gap-2">
                                {REPEAT_OPTIONS.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => setEditForm(prev => ({ ...prev, repeat: opt.value as any }))}
                                    className="rounded-xl border py-2.5 text-sm font-medium transition-all"
                                    style={{
                                      background: editForm.repeat === opt.value ? theme.primary : 'transparent',
                                      color: editForm.repeat === opt.value ? '#fff' : theme.text,
                                      borderColor: editForm.repeat === opt.value ? theme.primary : theme.line
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-medium" style={{ color: theme.textMuted }}>요일</label>
                              <div className="flex gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                  <button
                                    key={day.value}
                                    onClick={() => handleDayToggle(day.value)}
                                    className="h-10 w-10 rounded-full text-sm font-medium transition-all"
                                    style={{
                                      background: editForm.repeatDays.includes(day.value) ? theme.primary : theme.panelBackgroundStrong,
                                      color: editForm.repeatDays.includes(day.value) ? '#fff' : theme.text,
                                      border: `1px solid ${editForm.repeatDays.includes(day.value) ? theme.primary : theme.line}`
                                    }}
                                  >
                                    {day.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-medium" style={{ color: theme.textMuted }}>시간</label>
                              <input
                                type="time"
                                value={editForm.startTime}
                                onChange={e => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                                className="w-full rounded-xl border px-4 py-3 outline-none"
                                style={{ background: theme.panelBackgroundStrong, borderColor: theme.line, color: theme.text }}
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex-1 rounded-xl border py-3 text-sm font-medium"
                                style={{ borderColor: theme.line, color: theme.textMuted }}
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSave(event)}
                                className="flex-1 rounded-xl py-3 text-sm font-medium text-white"
                                style={{ background: theme.primary }}
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="h-10 w-10 rounded-full flex items-center justify-center"
                                style={{ background: `${getCategoryColor(event.categoryId)}20` }}
                              >
                                <Repeat className="h-5 w-5" style={{ color: getCategoryColor(event.categoryId) }} />
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="font-semibold" style={{ color: theme.text }}>{event.title}</h4>
                                <p className="text-sm" style={{ color: theme.textMuted }}>
                                  {category?.emoji} {category?.name}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="rounded-xl border p-3" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
                                <div className="text-xs mb-1" style={{ color: theme.textMuted }}>반복</div>
                                <div className="text-sm font-medium" style={{ color: theme.text }}>
                                  {getRepeatLabel(event.repeat || 'weekly')}
                                </div>
                              </div>
                              <div className="rounded-xl border p-3" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
                                <div className="text-xs mb-1" style={{ color: theme.textMuted }}>요일</div>
                                <div className="text-sm font-medium" style={{ color: theme.text }}>
                                  {event.repeatDays?.length ? getDaysLabel(event.repeatDays) : '-'}
                                </div>
                              </div>
                              <div className="rounded-xl border p-3" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
                                <div className="text-xs mb-1" style={{ color: theme.textMuted }}>시간</div>
                                <div className="text-sm font-medium" style={{ color: theme.text }}>
                                  {event.startTime}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(event)}
                                className="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all hover:scale-[1.02]"
                                style={{ borderColor: theme.line, color: theme.text }}
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="flex items-center justify-center rounded-xl px-4 py-2.5 transition-all hover:scale-[1.02]"
                                style={{ background: `${theme.accent1}20`, color: theme.accent1 }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t p-4" style={{ borderColor: theme.line }}>
              <button
                onClick={onClose}
                className="w-full rounded-xl py-3 font-semibold"
                style={{ background: theme.navBackground, color: theme.text }}
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
