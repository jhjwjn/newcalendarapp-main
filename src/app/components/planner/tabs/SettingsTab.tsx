import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Moon,
  Sun,
  Key,
  LogOut,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Cloud,
  CloudOff,
  Heart,
  Link2,
  Unlink,
  Copy,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';
import { toast } from '../../../lib/toast';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { PLANNER_GLASS_THEMES } from '../../../styles/colorThemes';
import {
  getMyConnection,
  createConnectionCode,
  acceptConnectionCode,
  disconnectPartner,
  PartnerConnection,
} from '../../../lib/partnerCalendar';

const ACCENT_OPTIONS: { id: 'blue' | 'purple' | 'peach' | 'black'; name: string }[] = [
  { id: 'blue', name: 'Ocean' },
  { id: 'purple', name: 'Violet' },
  { id: 'peach', name: 'Peach' },
  { id: 'black', name: 'Mono' },
];

const PRESET_COLORS = ['#3b82f6','#10b981','#ef4444','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
const PRESET_EMOJIS = ['💼','🌟','💪','📚','📝','🎯','🏃','🍎','✈️','🎵','💡','🏠','🛒','💰','🎮'];

const AI_PROVIDERS = [
  { key: 'groqApiKey' as const, name: 'Groq', placeholder: 'gsk_...', desc: 'Llama 3.3 70B — 운동/라우터 에이전트' },
  { key: 'geminiApiKey' as const, name: 'Google Gemini', placeholder: 'AIza...', desc: 'Gemini 2.0 Flash — 캘린더/영어 에이전트' },
];

export function SettingsTab() {
  const { settings, updateSettings, categories, addCategory, updateCategory, deleteCategory, signInWithGoogle, signOut, user, session, syncState, manualSync, refreshBriefing } = usePlanner();
  const theme = getPlannerTheme(settings);

  const [name, setName] = useState(settings.name || '');
  const [apiKeys, setApiKeys] = useState({
    groqApiKey: settings.groqApiKey || '',
    geminiApiKey: settings.geminiApiKey || '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 카테고리 편집 상태
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('#3b82f6');
  const [editingCatEmoji, setEditingCatEmoji] = useState('🏷️');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');

  // 파트너 연결 상태
  const [partnerConn, setPartnerConn] = useState<PartnerConnection | null>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerLoaded, setPartnerLoaded] = useState(false);

  React.useEffect(() => {
    if (user && !partnerLoaded) {
      setPartnerLoaded(true);
      getMyConnection(user.id).then(conn => {
        setPartnerConn(conn);
        if (conn?.connectionCode) setPartnerCode(conn.connectionCode);
      });
    }
  }, [user, partnerLoaded]);

  const handleGenerateCode = async () => {
    if (!user) return;
    setPartnerLoading(true);
    const code = await createConnectionCode(user.id);
    if (code) {
      setPartnerCode(code);
      const conn = await getMyConnection(user.id);
      setPartnerConn(conn);
    } else {
      toast.error('코드 생성에 실패했습니다. 다시 시도해주세요.');
    }
    setPartnerLoading(false);
  };

  const handleAcceptCode = async () => {
    if (!user || !codeInput.trim()) return;
    setPartnerLoading(true);
    const result = await acceptConnectionCode(user.id, codeInput.trim());
    if (result === 'ok') {
      toast.success('파트너와 연결되었습니다!');
      const conn = await getMyConnection(user.id);
      setPartnerConn(conn);
      setCodeInput('');
    } else if (result === 'self') {
      toast.error('본인의 코드는 사용할 수 없습니다');
    } else {
      toast.error('유효하지 않은 코드입니다');
    }
    setPartnerLoading(false);
  };

  const handleDisconnect = async () => {
    if (!partnerConn) return;
    setPartnerLoading(true);
    await disconnectPartner(partnerConn.id);
    setPartnerConn(null);
    setPartnerCode('');
    toast.info('파트너 연결이 해제되었습니다');
    setPartnerLoading(false);
  };

  const handleSaveName = async () => {
    setIsSavingName(true);
    await updateSettings({ name });
    toast.success('이름이 저장되었습니다');
    setIsSavingName(false);
  };

  const handleSaveApiKeys = async () => {
    setIsSavingKeys(true);
    await updateSettings(apiKeys);
    toast.success('API 키가 저장되었습니다');
    setIsSavingKeys(false);
  };

  const handleToggleDark = async () => {
    await updateSettings({ isDarkMode: !settings.isDarkMode });
  };

  const handleAccentChange = async (accent: 'blue' | 'purple' | 'peach' | 'black') => {
    if (settings.isDarkMode) {
      await updateSettings({ glassAccentDark: accent });
    } else {
      await updateSettings({ glassAccent: accent });
    }
  };

  const handleSync = async () => {
    if (!user) { toast.error('로그인이 필요합니다'); return; }
    setIsSyncing(true);
    await manualSync();
    toast.success('동기화 완료');
    setIsSyncing(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await addCategory({ name: newCatName.trim(), color: newCatColor, emoji: newCatEmoji });
    setNewCatName('');
    setNewCatColor('#3b82f6');
    setNewCatEmoji('🏷️');
    setIsAddingCat(false);
    toast.success('라벨이 추가되었습니다');
  };

  const handleStartEdit = (cat: typeof categories[0]) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatColor(cat.color);
    setEditingCatEmoji(cat.emoji);
  };

  const handleSaveEdit = async () => {
    if (!editingCatId || !editingCatName.trim()) return;
    await updateCategory(editingCatId, { name: editingCatName.trim(), color: editingCatColor, emoji: editingCatEmoji });
    setEditingCatId(null);
    toast.success('라벨이 수정되었습니다');
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('이 라벨을 삭제하시겠습니까?')) return;
    await deleteCategory(id);
    toast.success('라벨이 삭제되었습니다');
  };

  const currentAccent = settings.isDarkMode ? settings.glassAccentDark : settings.glassAccent;

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Configuration</p>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>설정</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* 왼쪽 열: 계정 + 파트너 + 프로필 */}
        <div className="space-y-4">
          {/* 계정 */}
          <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>계정</h2>
            {session ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: `${theme.primary}20`, color: theme.primary }}>
                    {(user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>{user?.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {syncState.status === 'synced' ? <Cloud className="h-3 w-3 text-green-500" /> : syncState.status === 'error' ? <CloudOff className="h-3 w-3 text-red-400" /> : <RefreshCw className="h-3 w-3 animate-spin" style={{ color: theme.primary }} />}
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>
                        {syncState.status === 'synced' ? '동기화됨' : syncState.status === 'error' ? '오류' : '동기화 중'}
                        {syncState.lastSync && ` · ${new Date(syncState.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border" style={{ borderColor: theme.line, color: theme.textSecondary }}>
                    <motion.div animate={isSyncing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: isSyncing ? Infinity : 0 }}><RefreshCw className="h-3.5 w-3.5" /></motion.div>
                    동기화
                  </button>
                  <button onClick={() => { signOut(); toast.success('로그아웃되었습니다'); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 border" style={{ borderColor: theme.line }}>
                    <LogOut className="h-3.5 w-3.5" />로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: theme.textSecondary }}>로그인하면 클라우드에 데이터가 자동 동기화됩니다.</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={signInWithGoogle} className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border" style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google로 로그인
                </motion.button>
              </div>
            )}
          </div>

          {/* 파트너 연결 */}
          {session && (
            <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-4 w-4" style={{ color: '#f43f5e' }} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>커플 캘린더</h2>
              </div>
              <p className="text-xs mb-3 rounded-xl p-2.5" style={{ background: '#f43f5e10', color: theme.textMuted, border: '1px solid #f43f5e20' }}>
                💡 파트너 일정은 캘린더 탭에서 빨간 하트 점으로 표시됩니다.
              </p>
              {partnerConn?.status === 'active' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: '#f43f5e15' }}>
                    <Link2 className="h-4 w-4" style={{ color: '#f43f5e' }} />
                    <p className="text-sm font-semibold" style={{ color: theme.text }}>파트너와 연결됨</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { if (window.confirm('파트너 연결이 해제됩니다. 새 코드를 생성하시겠습니까?')) handleGenerateCode(); }} disabled={partnerLoading} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border" style={{ borderColor: theme.line, color: theme.textSecondary }}>
                      <RefreshCw className="h-3.5 w-3.5" /> 코드 재생성
                    </button>
                    <button onClick={handleDisconnect} disabled={partnerLoading} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border" style={{ borderColor: theme.line, color: '#f43f5e' }}>
                      <Unlink className="h-3.5 w-3.5" /> 연결 해제
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.textMuted }}>내 연결 코드 생성</p>
                    {(partnerConn?.connectionCode || partnerCode) ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-2xl border px-4 py-2.5 text-center text-2xl font-black tracking-widest" style={{ background: theme.navBackground, borderColor: theme.line, color: theme.primary }}>
                            {partnerConn?.connectionCode || partnerCode}
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(partnerConn?.connectionCode || partnerCode); toast.success('코드가 복사되었습니다'); }} className="rounded-xl border p-2.5" style={{ borderColor: theme.line, color: theme.textMuted }}>
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <button onClick={handleGenerateCode} disabled={partnerLoading} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border w-full justify-center" style={{ borderColor: theme.line, color: theme.textSecondary }}>
                          <RefreshCw className="h-3.5 w-3.5" /> {partnerLoading ? '생성 중...' : '코드 재생성'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleGenerateCode} disabled={partnerLoading} className="w-full rounded-2xl py-2.5 text-sm font-semibold" style={{ background: theme.navBackground, color: theme.textSecondary, border: `1px solid ${theme.line}` }}>
                        {partnerLoading ? '생성 중...' : '코드 생성'}
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.textMuted }}>파트너 코드 입력</p>
                    <div className="flex gap-2">
                      <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} maxLength={6} placeholder="XXXXXX"
                        className="flex-1 rounded-2xl border px-4 py-2.5 text-center text-lg font-black tracking-widest outline-none uppercase"
                        style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }} />
                      <button onClick={handleAcceptCode} disabled={partnerLoading || codeInput.length !== 6} className="rounded-2xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>연결</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 프로필 */}
          <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>프로필</h2>
            <div className="flex gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력"
                className="flex-1 rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ background: theme.navBackground, color: theme.text, borderColor: theme.line }} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveName} disabled={isSavingName}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, boxShadow: `0 4px 12px ${theme.primary}30` }}>
                {isSavingName ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* 오른쪽 열: 테마 + AI 설정 */}
        <div className="space-y-4">
          {/* 테마 */}
          <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>테마</h2>
            <div className="flex items-center justify-between mb-4 p-3 rounded-2xl" style={{ background: theme.navBackground }}>
              <div className="flex items-center gap-2">
                {settings.isDarkMode ? <Moon className="h-4 w-4" style={{ color: theme.primary }} /> : <Sun className="h-4 w-4" style={{ color: theme.primary }} />}
                <span className="text-sm font-medium" style={{ color: theme.text }}>{settings.isDarkMode ? '다크 모드' : '라이트 모드'}</span>
              </div>
              <button onClick={handleToggleDark} className="relative h-6 w-11 rounded-full transition-all" style={{ background: settings.isDarkMode ? theme.primary : theme.line }}>
                <div className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: settings.isDarkMode ? '1.375rem' : '0.125rem' }} />
              </button>
            </div>
            <p className="text-xs font-medium mb-3" style={{ color: theme.textMuted }}>{settings.isDarkMode ? '다크 모드' : '라이트 모드'} 액센트</p>
            <div className="grid grid-cols-4 gap-3">
              {ACCENT_OPTIONS.map(opt => {
                const colors = PLANNER_GLASS_THEMES[opt.id];
                const isSelected = currentAccent === opt.id;
                return (
                  <button key={opt.id} onClick={() => handleAccentChange(opt.id)}
                    className="rounded-2xl p-3 text-center transition-all border"
                    style={{ background: isSelected ? `${colors.primary}15` : theme.navBackground, borderColor: isSelected ? colors.primary : theme.line }}>
                    <div className="h-6 w-full rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.tertiary}, ${colors.accent1})` }} />
                    <span className="text-[11px] font-semibold" style={{ color: isSelected ? colors.primary : theme.textMuted }}>{opt.name}</span>
                    {isSelected && <div className="flex justify-center mt-1"><Check className="h-3 w-3" style={{ color: colors.primary }} /></div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI 설정 — 4개 API 키 */}
          <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>AI 설정</h2>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveApiKeys} disabled={isSavingKeys}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                {isSavingKeys ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                저장
              </motion.button>
            </div>
            <p className="text-xs mb-4" style={{ color: theme.textMuted }}>AI 기능에 사용할 API 키를 입력하세요.</p>
            <div className="space-y-3">
              {AI_PROVIDERS.map(provider => {
                const value = apiKeys[provider.key];
                const hasKey = !!value;
                return (
                  <div key={provider.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: hasKey ? '#22c55e' : theme.line }} />
                        <span className="text-xs font-semibold" style={{ color: theme.text }}>{provider.name}</span>
                      </div>
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>{provider.desc}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5" style={{ background: theme.navBackground, borderColor: hasKey ? `${theme.primary}40` : theme.line }}>
                      <Key className="h-3.5 w-3.5 shrink-0" style={{ color: hasKey ? theme.primary : theme.textMuted }} />
                      <input
                        type={showKeys[provider.key] ? 'text' : 'password'}
                        value={value}
                        onChange={e => setApiKeys(prev => ({ ...prev, [provider.key]: e.target.value }))}
                        placeholder={provider.placeholder}
                        className="flex-1 bg-transparent text-xs outline-none"
                        style={{ color: theme.text }}
                      />
                      <button onClick={() => setShowKeys(prev => ({ ...prev, [provider.key]: !prev[provider.key] }))}>
                        {showKeys[provider.key] ? <EyeOff className="h-3.5 w-3.5" style={{ color: theme.textMuted }} /> : <Eye className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {settings.groqApiKey && (
              <button onClick={async () => { toast.loading('브리핑 생성 중...'); await refreshBriefing(); toast.success('브리핑이 업데이트되었습니다'); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: theme.primary }}>
                <RefreshCw className="h-3.5 w-3.5" /> AI 브리핑 새로고침
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 라벨(카테고리) 관리 — 전체 너비 */}
      <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: theme.primary }} />
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>라벨 설정</h2>
          </div>
          <button onClick={() => setIsAddingCat(v => !v)}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all"
            style={{ borderColor: isAddingCat ? theme.primary : theme.line, color: isAddingCat ? theme.primary : theme.textSecondary }}>
            <Plus className="h-3 w-3" /> 추가
          </button>
        </div>

        {/* 새 카테고리 추가 폼 */}
        <AnimatePresence>
          {isAddingCat && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-2xl border p-3 space-y-3"
              style={{ background: theme.navBackground, borderColor: `${theme.primary}30` }}>
              <div className="flex gap-2">
                <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="라벨 이름"
                  className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                <input type="text" value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} maxLength={2}
                  className="w-12 rounded-xl border px-2 py-2 text-center text-lg outline-none"
                  style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }} />
              </div>
              <div>
                <p className="text-[10px] mb-1.5" style={{ color: theme.textMuted }}>색상</p>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button key={color} onClick={() => setNewCatColor(color)}
                      className="h-6 w-6 rounded-full border-2 transition-all"
                      style={{ background: color, borderColor: newCatColor === color ? theme.text : 'transparent' }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] mb-1.5" style={{ color: theme.textMuted }}>이모지</p>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => setNewCatEmoji(emoji)}
                      className="rounded-lg px-1.5 py-1 text-sm border transition-all"
                      style={{ borderColor: newCatEmoji === emoji ? theme.primary : theme.line, background: newCatEmoji === emoji ? `${theme.primary}15` : 'transparent' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddCategory}
                  className="flex-1 rounded-xl py-2 text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                  추가
                </button>
                <button onClick={() => setIsAddingCat(false)}
                  className="rounded-xl px-4 py-2 text-sm border" style={{ borderColor: theme.line, color: theme.textMuted }}>
                  취소
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 카테고리 목록 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {categories.map(cat => (
            <div key={cat.id}>
              {editingCatId === cat.id ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border p-3 space-y-2"
                  style={{ background: theme.navBackground, borderColor: `${cat.color}40` }}>
                  <div className="flex gap-2">
                    <input type="text" value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                      className="flex-1 rounded-xl border px-3 py-1.5 text-sm outline-none"
                      style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }} />
                    <input type="text" value={editingCatEmoji} onChange={e => setEditingCatEmoji(e.target.value)} maxLength={2}
                      className="w-12 rounded-xl border px-2 py-1.5 text-center text-lg outline-none"
                      style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }} />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button key={color} onClick={() => setEditingCatColor(color)}
                        className="h-5 w-5 rounded-full border-2 transition-all"
                        style={{ background: color, borderColor: editingCatColor === color ? theme.text : 'transparent' }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 rounded-xl py-1.5 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>저장</button>
                    <button onClick={() => setEditingCatId(null)} className="rounded-xl px-3 py-1.5 text-xs border" style={{ borderColor: theme.line, color: theme.textMuted }}>취소</button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 group cursor-pointer transition-all hover:border-current"
                  style={{ background: theme.navBackground, borderColor: theme.line }}
                  onClick={() => handleStartEdit(cat)}>
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="text-sm mr-1">{cat.emoji}</span>
                  <span className="text-sm font-medium flex-1 truncate" style={{ color: theme.text }}>{cat.name}</span>
                  <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: theme.textMuted }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
