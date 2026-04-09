import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Dumbbell, Activity, TrendingUp, Settings } from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import { getHealthTheme } from '../../lib/healthTheme';
import { WorkspaceSwitchButton } from '../shared/WorkspaceSwitchButton';
import { HomeTab } from './tabs/HomeTab_Dynamic';
import { WorkoutTab } from './tabs/WorkoutTab';
import { RecordsTab } from './tabs/RecordsTab';
import { BodyTab } from './tabs/BodyTab';
import { SettingsTab } from './tabs/SettingsTab';

type TabId = 'home' | 'workout' | 'records' | 'body' | 'settings';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'workout', label: '운동', icon: Dumbbell },
  { id: 'records', label: '기록', icon: Activity },
  { id: 'body', label: '바디', icon: TrendingUp },
  { id: 'settings', label: '설정', icon: Settings },
];

interface HealthAppProps {
  onSwitchApp?: () => void;
}

export function HealthApp({ onSwitchApp }: HealthAppProps) {
  const { settings, workoutRecords, currentWeek } = useHealth();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const theme = getHealthTheme(settings);

  const thisWeekSessions = workoutRecords.filter(r => {
    const recordDate = new Date(r.date);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return recordDate >= weekStart;
  }).length;

  return (
    <div className="min-h-screen" style={{ background: theme.pageBackground, color: theme.text }}>
      {/* 배경 애니메이션 블롭 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 left-[8%] h-72 w-72 rounded-full blur-3xl"
          style={{ background: `${theme.primary}26` }}
          animate={{ x: [0, 18, 0], y: [0, 12, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[14%] right-[12%] h-80 w-80 rounded-full blur-3xl"
          style={{ background: `${theme.accent1}20` }}
          animate={{ x: [0, -16, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[8%] left-[34%] h-80 w-80 rounded-full blur-3xl"
          style={{ background: `${theme.tertiary}1c` }}
          animate={{ x: [0, 12, 0], y: [0, -14, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* 헤더 */}
      <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 md:px-5">
        <div
          className="mx-auto flex h-16 max-w-[1600px] items-center justify-between rounded-[28px] border px-4 backdrop-blur-2xl md:px-5"
          style={{
            background: theme.shellBackground,
            borderColor: theme.shellBorder,
            boxShadow: theme.shellShadow,
          }}
        >
          <div className="flex items-center gap-3">
            <WorkspaceSwitchButton
              appName="workout"
              onClick={onSwitchApp}
              title="Planner로 전환"
              textColor={theme.text}
              mutedColor={theme.textMuted}
            />
            {thisWeekSessions > 0 && (
              <div
                className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
                style={{
                  background: `${theme.primary}20`,
                  color: theme.primary,
                }}
              >
                🔥 이번 주 {thisWeekSessions}회
              </div>
            )}
          </div>

          <div
            className="rounded-2xl px-3 py-1.5 text-xs font-bold"
            style={{ background: theme.navBackground, color: theme.textSecondary }}
          >
            {settings.isDarkMode ? 'Night Mode' : 'Day Mode'}
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-24 md:pb-8">
        <div className="mx-auto max-w-[1600px] px-0 pt-20 md:px-5 md:pt-24">
          <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-5">

            {/* 데스크탑 사이드바 */}
            <aside
              className="hidden md:flex sticky top-24 h-[calc(100vh-7rem)] flex-col rounded-[28px] border p-3 backdrop-blur-2xl"
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                boxShadow: theme.shellShadow,
              }}
            >
              <nav className="flex flex-1 flex-col gap-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                      style={{
                        background: isActive ? theme.navActiveBackground : 'transparent',
                        color: isActive ? theme.navActiveText : theme.navIdleText,
                        boxShadow: isActive ? `${theme.buttonShadow || ''}, inset 0 1px 0 rgba(255,255,255,0.12)` : 'none',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* 주간 성과 */}
              <div
                className="mt-3 rounded-2xl border p-4"
                style={{
                  background: theme.accentSurface || theme.navBackground,
                  borderColor: theme.line,
                  boxShadow: theme.panelShadow,
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>
                  This Week
                </div>
                <div className="text-3xl font-black" style={{ color: theme.text }}>
                  {thisWeekSessions}
                </div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: theme.textSecondary }}>
                  workouts
                </div>
              </div>
            </aside>

            {/* 메인 콘텐츠 */}
            <section
              className="min-w-0 overflow-hidden rounded-none md:rounded-[28px] border-0 md:border backdrop-blur-2xl"
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                boxShadow: theme.shellShadow,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeTab === 'home' && <HomeTab theme={theme} onStartWorkout={() => setActiveTab('workout')} />}
                  {activeTab === 'workout' && <WorkoutTab theme={theme} />}
                  {activeTab === 'records' && <RecordsTab theme={theme} />}
                  {activeTab === 'body' && <BodyTab theme={theme} />}
                  {activeTab === 'settings' && <SettingsTab theme={theme} />}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>
        </div>
      </main>

      {/* 모바일 하단 탭바 */}
      <nav
        className="fixed bottom-3 left-3 right-3 z-50 rounded-[26px] border p-1.5 backdrop-blur-2xl md:hidden"
        style={{
          background: theme.shellBackground,
          borderColor: theme.shellBorder,
          boxShadow: theme.shellShadow,
        }}
      >
        <div className="grid h-14 grid-cols-5 gap-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center gap-0.5 rounded-[20px] transition-all"
                style={{
                  color: isActive ? theme.navActiveText : theme.navIdleText,
                  background: isActive ? theme.navActiveBackground : 'transparent',
                  boxShadow: isActive ? theme.buttonShadow : 'none',
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
