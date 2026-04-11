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

const COLOR_PALETTES = [
  {
    id: 'pastel', name: '파스텔', emoji: '🎀',
    colors: ['#F28B82','#FBBC04','#FFF475','#CCFF90','#A8DAB5','#CBF0F8','#AECBFA','#D7AEFB','#FDCFE8','#E6C9A8','#FF8A80','#FFD180','#69F0AE','#40C4FF','#FFB3C1'],
  },
  {
    id: 'wood', name: '우드', emoji: '🪵',
    colors: ['#C4924A','#D4A574','#E8C9A0','#B87333','#8B6914','#A0522D','#CD853F','#D2B48C','#DEB887','#F4A460','#BC9A6C','#8B7355','#9E7956','#C9956C','#E5C999'],
  },
  {
    id: 'ocean', name: '오션', emoji: '🌊',
    colors: ['#0077B6','#0096C7','#00B4D8','#48CAE4','#90E0EF','#023E8A','#0466C8','#4CC9F0','#4895EF','#4361EE','#3F37C9','#480CA8','#7B2FBE','#9D4EDD','#C77DFF'],
  },
  {
    id: 'forest', name: '포레스트', emoji: '🌿',
    colors: ['#1B4332','#2D6A4F','#40916C','#52B788','#74C69D','#95D5B2','#B7E4C7','#588157','#6A994E','#A7C957','#386641','#4F772D','#90A955','#DAD7CD','#A3B18A'],
  },
  {
    id: 'sunset', name: '선셋', emoji: '🌅',
    colors: ['#EF476F','#F79489','#F4A261','#E76F51','#E9C46A','#EE9B00','#CA6702','#BB3E03','#AE2012','#FF6B6B','#FFA07A','#FFD700','#FF8C00','#DC143C','#FF4500'],
  },
  {
    id: 'lavender', name: '라벤더', emoji: '💜',
    colors: ['#7B2D8B','#9B4DCA','#B57BEE','#C89FF5','#E0C3FC','#8338EC','#3A86FF','#F72585','#B5179E','#7209B7','#560BAD','#480CA8','#3A0CA3','#FF006E','#FFBE0B'],
  },
  {
    id: 'mono', name: '모노', emoji: '🖤',
    colors: ['#212121','#424242','#616161','#757575','#9E9E9E','#BDBDBD','#E0E0E0','#1A237E','#283593','#303F9F','#3949AB','#5C6BC0','#7986CB','#546E7A','#37474F'],
  },
];
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
  const [editingPaletteId, setEditingPaletteId] = useState('pastel');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');
  const [newPaletteId, setNewPaletteId] = useState('pastel');

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
    // Find which palette contains this color
    const matchPalette = COLOR_PALETTES.find(p => p.colors.includes(cat.color));
    setEditingPaletteId(matchPalette?.id ?? 'pastel');
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

      {/* 라벨(카테고리) 관리 */}
      <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: theme.primary }} />
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>라벨 설정</h2>
          </div>
          <button
            onClick={() => { setIsAddingCat(v => !v); setEditingCatId(null); }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
            style={{
              background: isAddingCat ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` : theme.navBackground,
              color: isAddingCat ? '#fff' : theme.textSecondary,
              border: `1px solid ${isAddingCat ? 'transparent' : theme.line}`,
            }}>
            <Plus className="h-3 w-3" /> {isAddingCat ? '닫기' : '라벨 추가'}
          </button>
        </div>

        {/* 새 라벨 추가 패널 */}
        <AnimatePresence>
          {isAddingCat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mb-5 rounded-2xl border p-4 space-y-4" style={{ background: theme.navBackground, borderColor: `${theme.primary}25` }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.primary }}>새 라벨 추가</p>

                {/* 이름 + 이모지 */}
                <div className="flex gap-2">
                  <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="라벨 이름"
                    className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                  <div className="flex flex-col items-center gap-1">
                    <input type="text" value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} maxLength={2}
                      className="w-12 rounded-xl border px-2 py-2.5 text-center text-lg outline-none"
                      style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }} />
                  </div>
                  <div className="h-10 w-10 self-center rounded-xl border-2 shrink-0 flex items-center justify-center font-bold text-white text-xs"
                    style={{ background: newCatColor, borderColor: newCatColor }}>
                    {newCatEmoji}
                  </div>
                </div>

                {/* 이모지 프리셋 */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>이모지</p>
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

                {/* 색상 팔레트 선택 */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>색상 톤 선택</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {COLOR_PALETTES.map(palette => (
                      <button key={palette.id} onClick={() => setNewPaletteId(palette.id)}
                        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all"
                        style={{
                          background: newPaletteId === palette.id ? `${theme.primary}18` : 'transparent',
                          borderColor: newPaletteId === palette.id ? theme.primary : theme.line,
                          color: newPaletteId === palette.id ? theme.primary : theme.textMuted,
                        }}>
                        <span>{palette.emoji}</span> {palette.name}
                        {/* 3-dot preview */}
                        <span className="flex gap-0.5 ml-0.5">
                          {palette.colors.slice(0, 3).map(c => (
                            <span key={c} className="h-2 w-2 rounded-full inline-block" style={{ background: c }} />
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {(COLOR_PALETTES.find(p => p.id === newPaletteId)?.colors ?? []).map(color => (
                      <button key={color} onClick={() => setNewCatColor(color)}
                        className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
                        style={{ background: color, borderColor: newCatColor === color ? theme.text : 'transparent', boxShadow: newCatColor === color ? `0 0 0 1px ${theme.text}` : 'none' }} />
                    ))}
                    {/* 직접 선택 */}
                    <label className="relative h-7 w-7 rounded-full border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden hover:scale-110 transition-all"
                      style={{ borderColor: theme.line }} title="직접 선택">
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>+</span>
                      <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={handleAddCategory}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                    추가하기
                  </button>
                  <button onClick={() => setIsAddingCat(false)}
                    className="rounded-xl px-5 py-2.5 text-sm border" style={{ borderColor: theme.line, color: theme.textMuted }}>
                    취소
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 편집 패널 */}
        <AnimatePresence>
          {editingCatId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mb-5 rounded-2xl border p-4 space-y-4" style={{ background: theme.navBackground, borderColor: `${theme.primary}25` }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.primary }}>라벨 편집</p>

                <div className="flex gap-2">
                  <input type="text" value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                    className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }} />
                  <input type="text" value={editingCatEmoji} onChange={e => setEditingCatEmoji(e.target.value)} maxLength={2}
                    className="w-12 rounded-xl border px-2 py-2.5 text-center text-lg outline-none"
                    style={{ background: theme.panelBackground, borderColor: theme.line, color: theme.text }} />
                  <div className="h-10 w-10 self-center rounded-xl border-2 shrink-0 flex items-center justify-center font-bold text-white text-xs"
                    style={{ background: editingCatColor, borderColor: editingCatColor }}>
                    {editingCatEmoji}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>이모지</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => setEditingCatEmoji(emoji)}
                        className="rounded-lg px-1.5 py-1 text-sm border transition-all"
                        style={{ borderColor: editingCatEmoji === emoji ? theme.primary : theme.line, background: editingCatEmoji === emoji ? `${theme.primary}15` : 'transparent' }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>색상 톤 선택</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {COLOR_PALETTES.map(palette => (
                      <button key={palette.id} onClick={() => setEditingPaletteId(palette.id)}
                        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all"
                        style={{
                          background: editingPaletteId === palette.id ? `${theme.primary}18` : 'transparent',
                          borderColor: editingPaletteId === palette.id ? theme.primary : theme.line,
                          color: editingPaletteId === palette.id ? theme.primary : theme.textMuted,
                        }}>
                        <span>{palette.emoji}</span> {palette.name}
                        <span className="flex gap-0.5 ml-0.5">
                          {palette.colors.slice(0, 3).map(c => (
                            <span key={c} className="h-2 w-2 rounded-full inline-block" style={{ background: c }} />
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {(COLOR_PALETTES.find(p => p.id === editingPaletteId)?.colors ?? []).map(color => (
                      <button key={color} onClick={() => setEditingCatColor(color)}
                        className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
                        style={{ background: color, borderColor: editingCatColor === color ? theme.text : 'transparent', boxShadow: editingCatColor === color ? `0 0 0 1px ${theme.text}` : 'none' }} />
                    ))}
                    <label className="relative h-7 w-7 rounded-full border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden hover:scale-110 transition-all"
                      style={{ borderColor: theme.line }} title="직접 선택">
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>+</span>
                      <input type="color" value={editingCatColor} onChange={e => setEditingCatColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                    저장하기
                  </button>
                  <button onClick={() => setEditingCatId(null)}
                    className="rounded-xl px-5 py-2.5 text-sm border" style={{ borderColor: theme.line, color: theme.textMuted }}>
                    취소
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 라벨 목록 */}
        {categories.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: theme.textMuted }}>아직 라벨이 없습니다. 라벨을 추가해보세요.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 group cursor-pointer transition-all"
                style={{
                  background: editingCatId === cat.id ? theme.panelBackgroundStrong : theme.navBackground,
                  borderColor: editingCatId === cat.id ? theme.primary : theme.line,
                }}
                onClick={() => { setIsAddingCat(false); handleStartEdit(cat); }}
              >
                <div className="h-4 w-4 rounded-full shrink-0 shadow-sm" style={{ background: cat.color }} />
                <span className="text-base leading-none">{cat.emoji}</span>
                <span className="text-sm font-medium flex-1 truncate" style={{ color: theme.text }}>{cat.name}</span>
                <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-red-50"
                  style={{ color: theme.textMuted }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
