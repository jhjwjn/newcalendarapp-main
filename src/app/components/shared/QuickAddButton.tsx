import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Calendar, Clock, Tag, Repeat, Bell, FileText, Check } from 'lucide-react';
import { toast } from '../../lib/toast';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { format } from 'date-fns';

interface QuickAddButtonProps {
  className?: string;
}

export function QuickAddButton({ className = '' }: QuickAddButtonProps) {
  const { settings, addEvent, categories } = usePlanner();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [category, setCategory] = useState(categories[0]?.name || '일반');
  const theme = getPlannerTheme(settings);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    const categoryId = categories.find(c => c.name === category)?.id || categories[0]?.id || '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + 60;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;

    await addEvent({
      title: title.trim(),
      date,
      startTime,
      endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      categoryId,
    });

    toast.success('일정이 등록되었어요!');
    setIsOpen(false);
    setTitle('');
    setStartTime('09:00');
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[180px] right-4 z-[52] flex h-14 w-14 items-center justify-center rounded-full shadow-lg ${className}`}
        style={{ background: theme.panelBackgroundStrong, border: `2px solid ${theme.primary}` }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="h-6 w-6" style={{ color: theme.primary }} />
      </motion.button>

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
              onClick={() => setIsOpen(false)}
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
                <h3 className="font-semibold" style={{ color: theme.text }}>빠른 일정 추가</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1"
                  style={{ background: theme.navBackground }}
                >
                  <X className="h-5 w-5" style={{ color: theme.textMuted }} />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                    <Calendar className="h-4 w-4" /> 제목
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="일정 제목을 입력하세요"
                    className="w-full rounded-xl border px-4 py-3 outline-none"
                    style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                      <Calendar className="h-4 w-4" /> 날짜
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full rounded-xl border px-3 py-3 outline-none"
                      style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                      <Clock className="h-4 w-4" /> 시간
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full rounded-xl border px-3 py-3 outline-none"
                      style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm" style={{ color: theme.textMuted }}>
                    <Tag className="h-4 w-4" /> 카테고리
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 outline-none"
                    style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.emoji} {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t p-4" style={{ borderColor: theme.line }}>
                <button
                  onClick={handleSave}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})` }}
                >
                  <Check className="h-5 w-5" />
                  등록하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
