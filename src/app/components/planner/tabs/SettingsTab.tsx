import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Download,
  Edit2,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from '../../../lib/toast';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { PLANNER_GLASS_THEMES, PLANNER_GLASS_THEMES_DARK } from '../../../styles/colorThemes';

const glassAccentThemes = [
  {
    id: 'blue' as const,
    name: 'Ocean Blue',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES.blue.primary}, ${PLANNER_GLASS_THEMES.blue.tertiary}, ${PLANNER_GLASS_THEMES.blue.accent1})`,
  },
  {
    id: 'purple' as const,
    name: 'Purple Dream',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES.purple.primary}, ${PLANNER_GLASS_THEMES.purple.secondary}, ${PLANNER_GLASS_THEMES.purple.accent1})`,
  },
  {
    id: 'peach' as const,
    name: 'Sunset Peach',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES.peach.primary}, ${PLANNER_GLASS_THEMES.peach.tertiary}, ${PLANNER_GLASS_THEMES.peach.accent1})`,
  },
  {
    id: 'black' as const,
    name: 'Soft Black',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES.black.primary}, ${PLANNER_GLASS_THEMES.black.tertiary}, ${PLANNER_GLASS_THEMES.black.accent2})`,
  },
];

const glassAccentThemesDark = [
  {
    id: 'blue' as const,
    name: 'Ocean Blue Dark',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES_DARK.blue.primary}, ${PLANNER_GLASS_THEMES_DARK.blue.tertiary}, ${PLANNER_GLASS_THEMES_DARK.blue.accent1})`,
  },
  {
    id: 'purple' as const,
    name: 'Purple Dream Dark',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES_DARK.purple.primary}, ${PLANNER_GLASS_THEMES_DARK.purple.secondary}, ${PLANNER_GLASS_THEMES_DARK.purple.accent1})`,
  },
  {
    id: 'peach' as const,
    name: 'Sunset Peach Dark',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES_DARK.peach.primary}, ${PLANNER_GLASS_THEMES_DARK.peach.tertiary}, ${PLANNER_GLASS_THEMES_DARK.peach.accent1})`,
  },
  {
    id: 'black' as const,
    name: 'Soft Black Dark',
    preview: `linear-gradient(135deg, ${PLANNER_GLASS_THEMES_DARK.black.primary}, ${PLANNER_GLASS_THEMES_DARK.black.tertiary}, ${PLANNER_GLASS_THEMES_DARK.black.accent2})`,
  },
];

const CATEGORY_COLOR_PRESETS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#64748B',
  '#111827',
];

function normalizeHex(value: string) {
  if (!value) return '#3B82F6';
  const next = value.startsWith('#') ? value : `#${value}`;
  const trimmed = next.slice(0, 7);
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : trimmed.toUpperCase();
}

export function SettingsTab() {
  const {
    settings,
    updateSettings,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    events,
    notes,
    refreshBriefing,
  } = usePlanner();
  const theme = getPlannerTheme(settings);

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [categoryColor, setCategoryColor] = useState('#3B82F6');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const resetCategoryEditor = () => {
    setShowAddCategory(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryEmoji('');
    setCategoryColor('#3B82F6');
  };

  const handleExportData = () => {
    const data = {
      events,
      notes,
      categories,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        JSON.parse(event.target?.result as string);
        if (confirm('데이터를 복원하시겠습니까? 현재 데이터가 덮어쓰여집니다.')) {
          toast.message('데이터 복원 기능은 준비 중입니다.');
        }
      } catch {
        toast.error('올바르지 않은 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !categoryEmoji.trim()) {
      toast.error('이름과 이모지를 입력해주세요');
      return;
    }

    const payload = {
      name: categoryName,
      emoji: categoryEmoji,
      color: normalizeHex(categoryColor),
    };

    if (editingCategory) {
      await updateCategory(editingCategory, payload);
    } else {
      await addCategory(payload);
    }

    resetCategoryEditor();
  };

  const handleEditCategory = (id: string) => {
    const category = categories.find(item => item.id === id);
    if (!category) return;
    setEditingCategory(id);
    setCategoryName(category.name);
    setCategoryEmoji(category.emoji);
    setCategoryColor(normalizeHex(category.color));
    setShowAddCategory(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteCategory(id);
      if (editingCategory === id) resetCategoryEditor();
    }
  };

  const currentAccentThemes = settings.isDarkMode ? glassAccentThemesDark : glassAccentThemes;
  const selectedAccent = settings.isDarkMode ? settings.glassAccentDark || 'blue' : settings.glassAccent || 'blue';

  const sectionStyle = {
    background: theme.panelBackground,
    borderColor: theme.panelBorder,
    boxShadow: theme.panelShadow,
  };

  const inputStyle = {
    background: theme.navBackground,
    borderColor: theme.line,
    color: theme.text,
  };

  return (
    <div className="mx-auto max-w-[1480px] p-3 md:p-5">
      <div className="mb-3 rounded-2xl border px-4 py-3 md:mb-4 md:rounded-[28px] md:px-5 md:py-4" style={sectionStyle}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] md:text-xs" style={{ color: theme.textMuted }}>
          Preferences
        </div>
        <h2 className="mt-0.5 text-lg font-semibold md:mt-1 md:text-2xl" style={{ color: theme.text }}>
          설정
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <div className="space-y-3 md:space-y-4">
          <section className="rounded-2xl border p-4 md:rounded-[28px] md:p-5" style={sectionStyle}>
            <div className="mb-3 md:mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] md:text-xs" style={{ color: theme.textMuted }}>
                Profile
              </div>
              <h3 className="mt-1 text-base font-semibold md:mt-1 md:text-lg" style={{ color: theme.text }}>
                기본 정보
              </h3>
            </div>
            <label className="mb-1.5 block text-xs font-medium md:mb-2 md:text-sm" style={{ color: theme.textSecondary }}>
              이름
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={e => updateSettings({ name: e.target.value })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm md:rounded-2xl md:px-4 md:py-3"
              style={inputStyle}
              placeholder="이름을 입력하세요"
            />
          </section>

          <section className="rounded-2xl border p-4 md:rounded-[28px] md:p-5" style={sectionStyle}>
            <div className="mb-3 flex items-start justify-between gap-2 md:mb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] md:text-xs" style={{ color: theme.textMuted }}>
                  AI
                </div>
                <h3 className="mt-1 text-base font-semibold md:mt-1 md:text-lg" style={{ color: theme.text }}>
                  API 설정
                </h3>
              </div>
              <button
                onClick={refreshBriefing}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-transform duration-200 hover:translate-y-[-1px] md:rounded-2xl md:gap-2 md:px-3.5 md:py-2.5 md:text-sm"
                style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
              >
                <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">브리핑 새로고침</span>
              </button>
            </div>
            <label className="mb-1.5 block text-xs font-medium md:mb-2 md:text-sm" style={{ color: theme.textSecondary }}>
              Groq API 키
            </label>
            <input
              type="password"
              value={settings.groqApiKey}
              onChange={e => updateSettings({ groqApiKey: e.target.value })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm md:rounded-2xl md:px-4 md:py-3"
              style={inputStyle}
              placeholder="API 키를 입력하세요"
            />
            <p className="mt-1.5 text-xs leading-5 md:mt-2 md:text-sm md:leading-6" style={{ color: theme.textMuted }}>
              AI 브리핑과 학습 피드백 기능에 사용됩니다.
            </p>
          </section>

          <section className="rounded-2xl border p-4 md:rounded-[28px] md:p-5" style={sectionStyle}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  {settings.isDarkMode ? <Moon className="h-4 w-4 md:h-5 md:w-5" style={{ color: theme.primary }} /> : <Sun className="h-4 w-4 md:h-5 md:w-5" style={{ color: theme.tertiary }} />}
                  <h3 className="text-base font-semibold md:text-lg" style={{ color: theme.text }}>
                    다크 모드
                  </h3>
                </div>
                <p className="mt-1.5 text-xs leading-5 md:mt-2 md:text-sm md:leading-6" style={{ color: theme.textMuted }}>
                  {settings.isDarkMode ? '블랙 기반의 네온 글래스 느낌' : '밝은 유리 질감과 파스텔 악센트'}
                </p>
              </div>
              <button
                onClick={() => updateSettings({ isDarkMode: !settings.isDarkMode })}
                className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors md:h-8 md:w-14"
                style={{ background: settings.isDarkMode ? theme.navActiveBackground : theme.line }}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white transition-transform md:h-6 md:w-6 ${settings.isDarkMode ? 'translate-x-6 md:translate-x-7' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </section>

          <section className="rounded-2xl border p-3 md:rounded-[28px] md:p-4" style={sectionStyle}>
            <div className="mb-2 flex items-center gap-1.5 md:mb-3">
              <Palette className="h-4 w-4 md:h-5 md:w-5" style={{ color: theme.primary }} />
              <div>
                <h3 className="text-sm font-semibold md:text-base" style={{ color: theme.text }}>
                  테마 설정
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 md:grid-cols-4 md:gap-2">
              {currentAccentThemes.map(accentTheme => {
                const isSelected = selectedAccent === accentTheme.id;
                return (
                  <button
                    key={accentTheme.id}
                    onClick={() => {
                      if (settings.isDarkMode) updateSettings({ glassAccentDark: accentTheme.id });
                      else updateSettings({ glassAccent: accentTheme.id });
                    }}
                    className="rounded-xl border p-1.5 text-left transition-transform duration-200 hover:scale-[1.02] md:rounded-[18px] md:p-2"
                    style={{
                      background: isSelected ? theme.panelBackgroundStrong : theme.navBackground,
                      borderColor: isSelected ? theme.primary : theme.line,
                    }}
                  >
                    <div className="mb-1.5 h-8 rounded-lg md:mb-2 md:h-12 md:rounded-[14px]" style={{ background: accentTheme.preview }} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold md:text-xs" style={{ color: theme.text }}>
                        {accentTheme.name.split(' ')[0]}
                      </span>
                      {isSelected && <Check className="h-3 w-3 md:h-4 md:w-4" style={{ color: theme.primary }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-3 md:space-y-4">
          <section className="rounded-2xl border p-4 md:rounded-[28px] md:p-5" style={sectionStyle}>
            <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] md:text-xs" style={{ color: theme.textMuted }}>
                  Labels
                </div>
                <h3 className="mt-1 text-base font-semibold md:mt-1 md:text-lg" style={{ color: theme.text }}>
                  라벨 관리
                </h3>
              </div>
              <button
                onClick={() => {
                  if (showAddCategory && !editingCategory) {
                    resetCategoryEditor();
                    return;
                  }
                  setEditingCategory(null);
                  setCategoryName('');
                  setCategoryEmoji('');
                  setCategoryColor('#3B82F6');
                  setShowAddCategory(true);
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-transform duration-200 hover:translate-y-[-1px] md:rounded-2xl md:gap-2 md:px-3.5 md:py-2.5 md:text-sm"
                style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
              >
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                추가
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showAddCategory && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-3 rounded-2xl border p-3 md:mb-4 md:rounded-[24px] md:p-4"
                  style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}
                >
                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 md:grid-cols-[110px_minmax(0,1fr)] md:gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium md:text-xs" style={{ color: theme.textMuted }}>
                        이모지
                      </label>
                      <input
                        type="text"
                        value={categoryEmoji}
                        onChange={e => setCategoryEmoji(e.target.value)}
                        className="w-full rounded-xl border px-2 py-2 text-center text-lg outline-none md:rounded-2xl md:px-3 md:py-3 md:text-xl"
                        style={inputStyle}
                        placeholder="😀"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium md:text-xs" style={{ color: theme.textMuted }}>
                        이름
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={e => setCategoryName(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none md:rounded-2xl md:px-4 md:py-3"
                        style={inputStyle}
                        placeholder="라벨 이름"
                      />
                    </div>
                  </div>

                  <div className="mt-3 md:mt-4">
                    <label className="mb-1.5 block text-[10px] font-medium md:mb-2 md:text-xs" style={{ color: theme.textMuted }}>
                      색상
                    </label>
                    <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
                      {CATEGORY_COLOR_PRESETS.map(color => {
                        const active = normalizeHex(categoryColor) === color;
                        return (
                          <button
                            key={color}
                            onClick={() => setCategoryColor(color)}
                            className="h-8 rounded-lg border transition-transform duration-200 hover:scale-[1.03] md:h-10 md:rounded-2xl"
                            style={{
                              background: color,
                              borderColor: active ? theme.text : 'transparent',
                              boxShadow: active ? `0 0 0 2px ${theme.panelBackgroundStrong}` : 'none',
                            }}
                            aria-label={color}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-[80px_minmax(0,1fr)] gap-2 md:mt-4 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium md:text-xs" style={{ color: theme.textMuted }}>
                        HEX
                      </label>
                      <input
                        type="text"
                        value={categoryColor}
                        onChange={e => setCategoryColor(normalizeHex(e.target.value))}
                        className="w-full rounded-xl border px-2 py-2 text-xs uppercase outline-none md:rounded-2xl md:px-3 md:py-3"
                        style={inputStyle}
                        placeholder="#3B82F6"
                        maxLength={7}
                      />
                    </div>
                    <div className="flex items-end gap-1.5 md:gap-2">
                      <div className="h-9 w-9 rounded-xl border md:h-12 md:rounded-2xl" style={{ background: normalizeHex(categoryColor), borderColor: theme.line }} />
                      <button
                        onClick={resetCategoryEditor}
                        className="flex-1 rounded-xl px-2 py-2 text-xs md:rounded-2xl md:px-4 md:py-3"
                        style={{ background: theme.navBackground, color: theme.textSecondary }}
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveCategory}
                        className="flex-1 rounded-xl px-2 py-2 text-xs font-semibold md:rounded-2xl md:px-4 md:py-3"
                        style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 md:rounded-[22px] md:gap-3 md:px-4 md:py-3"
                  style={{ background: theme.navBackground, borderColor: theme.line }}
                >
                  <div className="h-3 w-3 rounded-full md:h-4 md:w-4" style={{ backgroundColor: category.color }} />
                  <span className="text-base md:text-xl">{category.emoji}</span>
                  <span className="flex-1 text-xs font-semibold md:text-sm" style={{ color: theme.text }}>
                    {category.name}
                  </span>
                  <button
                    onClick={() => handleEditCategory(category.id)}
                    className="rounded-lg p-1.5 transition-colors md:rounded-xl md:p-2"
                    style={{ background: theme.panelBackgroundStrong, color: theme.textSecondary }}
                  >
                    <Edit2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="rounded-lg p-1.5 transition-colors md:rounded-xl md:p-2"
                    style={{ background: `${theme.accent1}14`, color: theme.accent1 }}
                  >
                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-4 md:rounded-[28px] md:p-5" style={sectionStyle}>
            <div className="mb-3 md:mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] md:text-xs" style={{ color: theme.textMuted }}>
                Data
              </div>
              <h3 className="mt-1 text-base font-semibold md:mt-1 md:text-lg" style={{ color: theme.text }}>
                데이터 관리
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium md:rounded-2xl md:gap-2 md:px-4 md:py-3 md:text-sm"
                style={{ background: theme.navBackground, color: theme.text }}
              >
                <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                내보내기
              </button>
              <label
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium md:rounded-2xl md:gap-2 md:px-4 md:py-3 md:text-sm"
                style={{ background: theme.navBackground, color: theme.text }}
              >
                <Upload className="h-3.5 w-3.5 md:h-4 md:w-4" />
                가져오기
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border p-4 md:rounded-[28px] md:p-5" style={sectionStyle}>
            <div className="mb-3 md:mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] md:text-xs" style={{ color: theme.textMuted }}>
                Alerts
              </div>
              <h3 className="mt-1 text-base font-semibold md:mt-1 md:text-lg" style={{ color: theme.text }}>
                알림
              </h3>
            </div>
            <button
              onClick={() => {
                if ('Notification' in window) Notification.requestPermission();
              }}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold md:rounded-2xl md:px-4 md:py-3 md:text-sm"
              style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
            >
              알림 권한 요청
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
