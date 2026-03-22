import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from '../../../lib/toast';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';

export function NotesTab() {
  const { notes, addNote, updateNote, deleteNote, settings } = usePlanner();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const theme = getPlannerTheme(settings);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }

    if (editingId) await updateNote(editingId, content);
    else await addNote(content);

    setContent('');
    setEditingId(null);
    setShowEditor(false);
  };

  const handleEdit = (id: string, currentContent: string) => {
    setEditingId(id);
    setContent(currentContent);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteNote(id);
    }
  };

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5">
      <div
        className="mb-4 flex items-center justify-between rounded-[28px] border px-4 py-4"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
            Notebook
          </div>
          <h2 className="text-2xl font-semibold" style={{ color: theme.text }}>
            메모
          </h2>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setContent('');
            setShowEditor(true);
          }}
          className="flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold"
          style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
        >
          <Plus className="h-4 w-4" />
          새 메모
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 origin-top rounded-[28px] border p-4 md:p-5"
            style={{
              background: theme.panelBackgroundStrong,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                  Editor
                </div>
                <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.text }}>
                  {editingId ? '메모 수정' : '새 메모'}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEditor(false);
                    setContent('');
                    setEditingId(null);
                  }}
                  className="rounded-2xl px-4 py-2 transition-colors"
                  style={{ color: theme.textSecondary, background: theme.navBackground }}
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-2xl px-4 py-2 font-semibold transition-transform duration-200 hover:translate-y-[-1px]"
                  style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
                >
                  저장
                </button>
              </div>
            </div>

            <motion.textarea
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, delay: 0.04 }}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[360px] w-full resize-y rounded-[24px] border px-5 py-4 outline-none md:min-h-[460px]"
              style={{ borderColor: theme.line, background: theme.navBackground, color: theme.text }}
              placeholder="메모 내용을 입력하세요..."
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.length === 0 ? (
          <div className="col-span-full rounded-[28px] border py-16 text-center" style={{ background: theme.panelBackground, borderColor: theme.panelBorder, color: theme.textMuted }}>
            메모가 없습니다. 새 메모를 추가해보세요!
          </div>
        ) : (
          notes
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map(note => (
              <div
                key={note.id}
                className="rounded-[28px] border p-5"
                style={{
                  background: theme.panelBackground,
                  borderColor: theme.panelBorder,
                  boxShadow: theme.panelShadow,
                }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    {format(new Date(note.updatedAt), 'M월 d일 (E) HH:mm', { locale: ko })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(note.id, note.content)} className="p-1" style={{ color: theme.textMuted }}>
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(note.id)} className="p-1" style={{ color: theme.accent1 }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="line-clamp-7 whitespace-pre-wrap text-[15px] leading-7" style={{ color: theme.textSecondary }}>
                  {note.content}
                </p>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
