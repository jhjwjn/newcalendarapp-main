import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Moon,
  Sun,
  User,
  Key,
  LogIn,
  LogOut,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Cloud,
  CloudOff,
  Heart,
  Link2,
  LinkOff,
  Copy,
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

export function SettingsTab() {
  const { settings, updateSettings, signInWithGoogle, signOut, user, session, syncState, manualSync, refreshBriefing } = usePlanner();
  const theme = getPlannerTheme(settings);

  const [name, setName] = useState(settings.name || '');
  const [groqKey, setGroqKey] = useState(settings.groqApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 파트너 연결 상태
  const [partnerConn, setPartnerConn] = useState<PartnerConnection | null>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [partnerLoading, setPartnerLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getMyConnection(user.id).then(setPartnerConn);
    }
  }, [user]);

  const handleGenerateCode = async () => {
    if (!user) return;
    setPartnerLoading(true);
    const code = await createConnectionCode(user.id);
    if (code) {
      setPartnerCode(code);
      const conn = await getMyConnection(user.id);
      setPartnerConn(conn);
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

  const handleSaveGroqKey = async () => {
    setIsSavingKey(true);
    await updateSettings({ groqApiKey: groqKey });
    toast.success('API 키가 저장되었습니다');
    setIsSavingKey(false);
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
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }
    setIsSyncing(true);
    await manualSync();
    toast.success('동기화 완료');
    setIsSyncing(false);
  };

  const currentAccent = settings.isDarkMode ? settings.glassAccentDark : settings.glassAccent;

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
          Configuration
        </p>
        <h1 className="text-2xl font-black" style={{ color: theme.text }}>설정</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* 왼쪽 열: 계정 + 프로필 */}
        <div className="space-y-4">
          {/* 계정 */}
          <div
            className="rounded-2xl border p-4 md:p-5"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>
              계정
            </h2>

            {session ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: `${theme.primary}20`, color: theme.primary }}
                  >
                    {(user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {syncState.status === 'synced' ? (
                        <Cloud className="h-3 w-3 text-green-500" />
                      ) : syncState.status === 'error' ? (
                        <CloudOff className="h-3 w-3 text-red-400" />
                      ) : (
                        <RefreshCw className="h-3 w-3 animate-spin" style={{ color: theme.primary }} />
                      )}
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>
                        {syncState.status === 'synced' ? '동기화됨' : syncState.status === 'error' ? '오류' : '동기화 중'}
                        {syncState.lastSync && ` · ${new Date(syncState.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-all"
                    style={{ borderColor: theme.line, color: theme.textSecondary }}
                  >
                    <motion.div animate={isSyncing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: isSyncing ? Infinity : 0 }}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </motion.div>
                    동기화
                  </button>
                  <button
                    onClick={() => { signOut(); toast.success('로그아웃되었습니다'); }}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 border transition-all"
                    style={{ borderColor: `${theme.line}` }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  로그인하면 클라우드에 데이터가 자동 동기화됩니다.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border"
                  style={{
                    background: theme.panelBackground,
                    borderColor: theme.line,
                    color: theme.text,
                  }}
                >
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

          {/* 파트너 연결 (커플 캘린더) */}
          {session && (
            <div className="rounded-2xl border p-4 md:p-5" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-4 w-4" style={{ color: '#f43f5e' }} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                  커플 캘린더
                </h2>
              </div>

              {partnerConn?.status === 'active' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: `#f43f5e15` }}>
                    <Link2 className="h-4 w-4" style={{ color: '#f43f5e' }} />
                    <p className="text-sm font-semibold" style={{ color: theme.text }}>파트너와 연결됨</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={partnerLoading}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border"
                    style={{ borderColor: theme.line, color: '#f43f5e' }}
                  >
                    <LinkOff className="h-3.5 w-3.5" /> 연결 해제
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 코드 생성 */}
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.textMuted }}>내 연결 코드 생성</p>
                    {partnerConn?.connectionCode || partnerCode ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-2xl border px-4 py-2.5 text-center text-xl font-black tracking-widest" style={{ background: theme.navBackground, borderColor: theme.line, color: theme.primary }}>
                          {partnerConn?.connectionCode || partnerCode}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(partnerConn?.connectionCode || partnerCode);
                            toast.success('코드가 복사되었습니다');
                          }}
                          className="rounded-xl border p-2.5"
                          style={{ borderColor: theme.line, color: theme.textMuted }}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateCode}
                        disabled={partnerLoading}
                        className="w-full rounded-2xl py-2.5 text-sm font-semibold"
                        style={{ background: theme.navBackground, color: theme.textSecondary, border: `1px solid ${theme.line}` }}
                      >
                        {partnerLoading ? '생성 중...' : '코드 생성'}
                      </button>
                    )}
                  </div>

                  {/* 코드 입력 */}
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.textMuted }}>파트너 코드 입력</p>
                    <div className="flex gap-2">
                      <input
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="XXXXXX"
                        className="flex-1 rounded-2xl border px-4 py-2.5 text-center text-lg font-black tracking-widest outline-none uppercase"
                        style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
                      />
                      <button
                        onClick={handleAcceptCode}
                        disabled={partnerLoading || codeInput.length !== 6}
                        className="rounded-2xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                      >
                        연결
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 프로필 */}
          <div
            className="rounded-2xl border p-4 md:p-5"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>
              프로필
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="이름 입력"
                className="flex-1 rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ background: theme.navBackground, color: theme.text, borderColor: theme.line }}
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveName}
                disabled={isSavingName}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  boxShadow: `0 4px 12px ${theme.primary}30`,
                }}
              >
                {isSavingName ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* 오른쪽 열: 테마 + AI 설정 */}
        <div className="space-y-4">
          {/* 테마 */}
          <div
            className="rounded-2xl border p-4 md:p-5"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: theme.textMuted }}>
              테마
            </h2>

            {/* 다크/라이트 토글 */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-2xl" style={{ background: theme.navBackground }}>
              <div className="flex items-center gap-2">
                {settings.isDarkMode ? (
                  <Moon className="h-4 w-4" style={{ color: theme.primary }} />
                ) : (
                  <Sun className="h-4 w-4" style={{ color: theme.primary }} />
                )}
                <span className="text-sm font-medium" style={{ color: theme.text }}>
                  {settings.isDarkMode ? '다크 모드' : '라이트 모드'}
                </span>
              </div>
              <button
                onClick={handleToggleDark}
                className="relative h-6 w-11 rounded-full transition-all"
                style={{ background: settings.isDarkMode ? theme.primary : theme.line }}
              >
                <div
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: settings.isDarkMode ? '1.375rem' : '0.125rem' }}
                />
              </button>
            </div>

            {/* 액센트 색상 */}
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: theme.textMuted }}>
                {settings.isDarkMode ? '다크 모드' : '라이트 모드'} 액센트
              </p>
              <div className="grid grid-cols-4 gap-3">
                {ACCENT_OPTIONS.map(opt => {
                  const colors = PLANNER_GLASS_THEMES[opt.id];
                  const isSelected = currentAccent === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAccentChange(opt.id)}
                      className="rounded-2xl p-3 text-center transition-all border"
                      style={{
                        background: isSelected ? `${colors.primary}15` : theme.navBackground,
                        borderColor: isSelected ? colors.primary : theme.line,
                      }}
                    >
                      <div
                        className="h-6 w-full rounded-lg mb-2"
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary}, ${colors.tertiary}, ${colors.accent1})`,
                        }}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: isSelected ? colors.primary : theme.textMuted }}>
                        {opt.name}
                      </span>
                      {isSelected && (
                        <div className="flex justify-center mt-1">
                          <Check className="h-3 w-3" style={{ color: colors.primary }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Groq API 키 */}
          <div
            className="rounded-2xl border p-4 md:p-5"
            style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
              AI 설정
            </h2>
            <p className="text-xs mb-4" style={{ color: theme.textMuted }}>
              Groq API 키를 입력하면 AI 브리핑 기능을 사용할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <div
                className="flex flex-1 items-center gap-2 rounded-2xl border px-4 py-3"
                style={{ background: theme.navBackground, borderColor: theme.line }}
              >
                <Key className="h-4 w-4 shrink-0" style={{ color: theme.textMuted }} />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={e => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: theme.text }}
                />
                <button onClick={() => setShowKey(v => !v)}>
                  {showKey ? (
                    <EyeOff className="h-4 w-4" style={{ color: theme.textMuted }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: theme.textMuted }} />
                  )}
                </button>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveGroqKey}
                disabled={isSavingKey}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  boxShadow: `0 4px 12px ${theme.primary}30`,
                }}
              >
                {isSavingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </motion.button>
            </div>
            {settings.groqApiKey && (
              <button
                onClick={async () => {
                  toast.loading('브리핑 생성 중...');
                  await refreshBriefing();
                  toast.success('브리핑이 업데이트되었습니다');
                }}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                AI 브리핑 새로고침
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
