import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2, Edit2, Pin, PinOff, Search, X, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from '../../../lib/toast';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';

export function NotesTab() {
  const { notes, addNote, updateNote, deleteNote, pinNote, settings } = usePlanner();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const theme = getPlannerTheme(settings);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = query
      ? notes.filter(n =>
          n.content.toLowerCase().includes(query) ||
          (n.title || '').toLowerCase().includes(query)
        )
      : notes;
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, searchQuery]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }
    if (editingId) {
      await updateNote(editingId, content, title);
      toast.success('메모가 수정되었습니다');
    } else {
      await addNote(content, title);
      toast.success('메모가 저장되었습니다');
    }
    setTitle('');
    setContent('');
    setEditingId(null);
    setShowEditor(false);
  };

  const handleEdit = (id: string, noteTitle: string, noteContent: string) => {
    setEditingId(id);
    setTitle(noteTitle || '');
    setContent(noteContent);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    toast.success('메모가 삭제되었습니다');
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setShowEditor(true);
  };

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
            Notebook
          </p>
          <h1 className="text-2xl font-black" style={{ color: theme.text }}>메모</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            boxShadow: `0 8px 24px ${theme.primary}30`,
          }}
        >
          <Plus className="h-4 w-4" />
          새 메모
        </motion.button>
      </div>

      {/* 검색 */}
      {notes.length > 3 && (
        <div
          className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
          style={{ background: theme.navBackground, borderColor: theme.line }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: theme.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="메모 검색..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: theme.text }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="h-4 w-4" style={{ color: theme.textMuted }} />
            </button>
          )}
        </div>
      )}

      {/* 메모 목록 */}
      {filteredNotes.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
            {searchQuery ? '검색 결과가 없어요' : '메모가 없어요'}
          </p>
          <p className="text-xs mb-4" style={{ color: theme.textMuted }}>
            {searchQuery ? '다른 키워드로 검색해보세요' : '생각과 아이디어를 기록해보세요'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreate}
              className="text-sm font-bold px-4 py-2 rounded-2xl"
              style={{ background: `${theme.primary}18`, color: theme.primary }}
            >
              첫 메모 작성하기
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredNotes.map(note => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="break-inside-avoid rounded-2xl border p-4 transition-all"
              style={{
                background: theme.panelBackground,
                borderColor: note.pinned ? `${theme.primary}40` : theme.panelBorder,
                marginBottom: '1rem',
              }}
            >
              {/* 메모 헤더 */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <h3 className="text-sm font-bold mb-1 truncate" style={{ color: theme.text }}>
                      {note.title}
                    </h3>
                  )}
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {format(new Date(note.updatedAt), 'M월 d일 HH:mm', { locale: ko })}
                  </p>
                </div>
                {note.pinned && (
                  <div className="shrink-0">
                    <Pin className="h-3.5 w-3.5" style={{ color: theme.primary }} />
                  </div>
                )}
              </div>

              {/* 내용 */}
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: theme.textSecondary }}
              >
                {note.content}
              </p>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-1 mt-3 pt-3" style={{ borderTop: `1px solid ${theme.line}` }}>
                <button
                  onClick={() => pinNote(note.id, !note.pinned)}
                  className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all"
                  style={{ color: note.pinned ? theme.primary : theme.textMuted }}
                >
                  {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  {note.pinned ? '고정 해제' : '고정'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleEdit(note.id, note.title || '', note.content)}
                  className="p-1.5 rounded-xl transition-all"
                  style={{ color: theme.textMuted }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1.5 rounded-xl transition-all"
                  style={{ color: theme.textMuted }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 메모 편집 모달 */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowEditor(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-3xl border"
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-5 pb-3">
                <h3 className="text-lg font-black" style={{ color: theme.text }}>
                  {editingId ? '메모 수정' : '새 메모'}
                </h3>
                <button
                  onClick={() => setShowEditor(false)}
                  className="p-1.5 rounded-xl"
                  style={{ color: theme.textMuted }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 pb-2 space-y-3">
                {/* 제목 */}
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="제목 (선택)"
                  className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none"
                  style={{
                    background: theme.navBackground,
                    color: theme.text,
                    borderColor: theme.line,
                  }}
                />

                {/* 내용 */}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="내용을 입력하세요..."
                  rows={8}
                  autoFocus
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none leading-relaxed"
                  style={{
                    background: theme.navBackground,
                    color: theme.text,
                    borderColor: theme.line,
                  }}
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 p-5 pt-3">
                <button
                  onClick={() => setShowEditor(false)}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold border"
                  style={{ background: 'transparent', color: theme.textMuted, borderColor: theme.line }}
                >
                  취소
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                    boxShadow: `0 8px 24px ${theme.primary}30`,
                  }}
                >
                  <Check className="h-4 w-4" />
                  저장
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
