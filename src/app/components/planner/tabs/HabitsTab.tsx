import React, { useState, useMemo } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CheckCircle2,
  Circle,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { Habit } from '../../../types/planner';
import { toast } from '../../../lib/toast';

const HABIT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

const HABIT_EMOJIS = ['💧', '📖', '🏃', '🧘', '💪', '🥗', '😴', '✍️', '🎵', '🌿', '🧠', '❤️'];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface HabitFormData {
  name: string;
  emoji: string;
  color: string;
  targetDays: number[];
}

const defaultForm: HabitFormData = {
  name: '',
  emoji: '💧',
  color: '#3b82f6',
  targetDays: [],
};

export function HabitsTab() {
  const { habits, habitRecords, addHabit, updateHabit, deleteHabit, toggleHabitRecord, settings } = usePlanner();
  const theme = getPlannerTheme(settings);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormData>(defaultForm);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // 최근 7일
  const last7Days = useMemo(() => {
    return eachDayOfInterval({ start: subDays(today, 6), end: today });
  }, []);

  const completedToday = new Set(
    habitRecords.filter(r => r.date === selectedDate).map(r => r.habitId)
  );

  const todayDayOfWeek = new Date(selectedDate).getDay();
  const habitsForToday = habits.filter(h =>
    h.targetDays.length === 0 || h.targetDays.includes(todayDayOfWeek)
  );

  const handleOpenCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    setForm({
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
      targetDays: habit.targetDays,
    });
    setEditingId(habit.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('습관 이름을 입력해주세요');
      return;
    }
    if (editingId) {
      updateHabit(editingId, form);
      toast.success('습관이 수정되었습니다');
    } else {
      addHabit(form);
      toast.success('새 습관이 추가되었습니다');
    }
    setShowForm(false);
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteHabit(id);
    toast.success('습관이 삭제되었습니다');
  };

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      targetDays: prev.targetDays.includes(day)
        ? prev.targetDays.filter(d => d !== day)
        : [...prev.targetDays, day],
    }));
  };

  // 습관별 최근 7일 완료 여부
  const getHabitWeekMap = (habitId: string) => {
    return last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return habitRecords.some(r => r.habitId === habitId && r.date === dateStr);
    });
  };

  // 오늘 완료율
  const completedCount = habitsForToday.filter(h => completedToday.has(h.id)).length;
  const completionRate = habitsForToday.length > 0
    ? Math.round((completedCount / habitsForToday.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
            Habits
          </p>
          <h1 className="text-2xl font-black" style={{ color: theme.text }}>습관 추적</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.secondary})`,
            color: '#fff',
            boxShadow: `0 8px 24px ${theme.primary}30`,
          }}
        >
          <Plus className="h-4 w-4" />
          추가
        </motion.button>
      </div>

      {/* 오늘 완료율 */}
      {habitsForToday.length > 0 && (
        <div
          className="rounded-2xl border p-4 md:p-5"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4" style={{ color: theme.primary }} />
              <span className="text-sm font-bold" style={{ color: theme.text }}>
                오늘 달성률
              </span>
            </div>
            <span className="text-2xl font-black" style={{ color: theme.primary }}>
              {completionRate}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.line }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent1 || theme.secondary})`,
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
            {habitsForToday.length}개 중 {completedCount}개 완료
          </p>
        </div>
      )}

      {/* 습관 목록 */}
      {habits.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>아직 습관이 없어요</p>
          <p className="text-xs mb-4" style={{ color: theme.textMuted }}>
            작은 습관 하나가 큰 변화를 만들어요
          </p>
          <button
            onClick={handleOpenCreate}
            className="text-sm font-bold px-4 py-2 rounded-2xl"
            style={{ background: `${theme.primary}18`, color: theme.primary }}
          >
            첫 번째 습관 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => {
            const weekMap = getHabitWeekMap(habit.id);
            const isDueToday = habit.targetDays.length === 0 || habit.targetDays.includes(todayDayOfWeek);
            const doneToday = completedToday.has(habit.id);
            const weekStreak = weekMap.filter(Boolean).length;

            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border p-4 transition-all"
                style={{
                  background: doneToday ? `${habit.color}08` : theme.panelBackground,
                  borderColor: doneToday ? `${habit.color}30` : theme.panelBorder,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* 완료 버튼 */}
                  {isDueToday ? (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleHabitRecord(habit.id, todayStr)}
                      className="shrink-0"
                    >
                      {doneToday ? (
                        <CheckCircle2 className="h-7 w-7" style={{ color: habit.color }} />
                      ) : (
                        <Circle className="h-7 w-7 opacity-30" style={{ color: habit.color }} />
                      )}
                    </motion.button>
                  ) : (
                    <div
                      className="h-7 w-7 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: theme.line }}
                    >
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>쉼</span>
                    </div>
                  )}

                  {/* 습관 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{habit.emoji}</span>
                      <span
                        className="text-sm font-bold truncate"
                        style={{
                          color: doneToday ? theme.textMuted : theme.text,
                          textDecoration: doneToday ? 'line-through' : 'none',
                        }}
                      >
                        {habit.name}
                      </span>
                      {weekStreak > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: `${habit.color}18`, color: habit.color }}
                        >
                          {weekStreak}/7
                        </span>
                      )}
                    </div>
                    {/* 요일 태그 */}
                    {habit.targetDays.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {DAY_LABELS.map((label, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium"
                            style={{
                              color: habit.targetDays.includes(idx) ? habit.color : theme.textMuted,
                              opacity: habit.targetDays.includes(idx) ? 1 : 0.4,
                            }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {habit.targetDays.length === 0 && (
                      <p className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>매일</p>
                    )}
                  </div>

                  {/* 최근 7일 히트맵 */}
                  <div className="hidden sm:flex items-center gap-1">
                    {weekMap.map((done, idx) => (
                      <div
                        key={idx}
                        className="h-3 w-3 rounded-sm"
                        style={{
                          background: done ? habit.color : theme.line,
                          opacity: done ? 0.9 : 0.4,
                        }}
                      />
                    ))}
                  </div>

                  {/* 편집/삭제 */}
                  <div className="flex items-center gap-1 ml-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleOpenEdit(habit)}
                      className="p-1.5 rounded-xl transition-all"
                      style={{ color: theme.textMuted }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(habit.id)}
                      className="p-1.5 rounded-xl transition-all"
                      style={{ color: theme.textMuted }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 습관 추가/편집 모달 */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-3xl border p-5 md:p-6"
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-black" style={{ color: theme.text }}>
                  {editingId ? '습관 수정' : '새 습관'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-xl"
                  style={{ color: theme.textMuted }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 이모지 선택 */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: theme.textMuted }}>
                    아이콘
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setForm(prev => ({ ...prev, emoji }))}
                        className="text-xl p-2 rounded-xl transition-all"
                        style={{
                          background: form.emoji === emoji ? `${form.color}20` : theme.hoverBackground,
                          border: `2px solid ${form.emoji === emoji ? form.color : 'transparent'}`,
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 이름 */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: theme.textMuted }}>
                    습관 이름
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 물 2L 마시기"
                    className="w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2"
                    style={{
                      background: theme.navBackground,
                      color: theme.text,
                      borderColor: theme.line,
                    }}
                  />
                </div>

                {/* 색상 */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: theme.textMuted }}>
                    색상
                  </label>
                  <div className="flex gap-2">
                    {HABIT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setForm(prev => ({ ...prev, color }))}
                        className="h-7 w-7 rounded-full transition-all"
                        style={{
                          background: color,
                          ring: form.color === color ? `3px solid ${color}` : 'none',
                          outline: form.color === color ? `3px solid ${color}` : '3px solid transparent',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* 요일 선택 */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: theme.textMuted }}>
                    목표 요일 (비워두면 매일)
                  </label>
                  <div className="flex gap-2">
                    {DAY_LABELS.map((label, idx) => {
                      const selected = form.targetDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleDay(idx)}
                          className="h-9 w-9 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: selected ? form.color : theme.hoverBackground,
                            color: selected ? '#fff' : theme.textMuted,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold border"
                    style={{
                      background: 'transparent',
                      color: theme.textMuted,
                      borderColor: theme.line,
                    }}
                  >
                    취소
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`,
                      boxShadow: `0 8px 24px ${form.color}30`,
                    }}
                  >
                    {editingId ? '저장' : '추가'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
