import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Activity, Settings, Dumbbell, Flame } from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import { getHealthTheme } from '../../lib/healthTheme';
import { WorkspaceSwitchButton } from '../shared/WorkspaceSwitchButton';
import { HomeTab } from './tabs/HomeTab_Dynamic';
import { RecordsTab } from './tabs/RecordsTab';
import { BodyTab } from './tabs/BodyTab';
import { SettingsTab } from './tabs/SettingsTab';

type ThemeMode = 'light' | 'dark';
type AccentColor = 'red' | 'blue' | 'orange' | 'black';

interface HealthAppProps {
  onSwitchApp?: () => void;
}

export function HealthApp({ onSwitchApp }: HealthAppProps) {
  const { settings, currentWeek, workoutRecords } = useHealth();
  const [activeTab, setActiveTab] = useState<'home' | 'workout' | 'records' | 'body' | 'settings'>('home');
  const [themeMode, setThemeMode] = useState<ThemeMode>(settings.isDarkMode ? 'dark' : 'light');
  const [accentColor, setAccentColor] = useState<AccentColor>(((settings.isDarkMode ? settings.dynamicAccentDark : settings.dynamicAccent) as AccentColor) || 'orange');
  const theme = getHealthTheme(settings);

  React.useEffect(() => {
    setThemeMode(settings.isDarkMode ? 'dark' : 'light');
    setAccentColor(((settings.isDarkMode ? settings.dynamicAccentDark : settings.dynamicAccent) as AccentColor) || 'orange');
    document.body.style.background = theme.pageBackground;
    document.body.style.color = theme.text;
  }, [settings.isDarkMode, settings.dynamicAccent, settings.dynamicAccentDark, theme.pageBackground, theme.text]);

  const tabs = [
    { id: 'home' as const, label: '홈', icon: Home },
    { id: 'workout' as const, label: '운동', icon: Flame },
    { id: 'records' as const, label: '기록', icon: Activity },
    { id: 'body' as const, label: '바디', icon: Dumbbell },
    { id: 'settings' as const, label: '설정', icon: Settings },
  ];

  const thisWeekSessions = workoutRecords.filter(record => record.weekNumber === currentWeek).length;

  return (
    <div className="min-h-screen" style={{ background: theme.pageBackground, color: theme.text }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 left-[8%] h-72 w-72 rounded-full blur-3xl"
          style={{ background: `${theme.primary}26` }}
          animate={{ x: [0, 18, 0], y: [0, 12, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[14%] right-[12%] h-96 w-96 rounded-full blur-3xl"
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
              title="클릭하여 Planner 앱으로 전환"
              textColor={theme.text}
              mutedColor={theme.textMuted}
            />
            <div
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm sm:flex"
              style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
            >
              <Flame className="h-4 w-4" />
              <span>{thisWeekSessions} sessions this week</span>
            </div>
          </div>

          <div
            className="rounded-2xl px-3 py-2 text-sm font-semibold"
            style={{ background: theme.navBackground, color: theme.textSecondary }}
          >
            {settings.isDarkMode ? 'Night Training' : 'Day Training'}
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-24 md:pb-8">
        <div className="mx-auto max-w-[1600px] px-3 pt-20 md:px-5 md:pt-24">
          <div className="md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-5">
            <aside
              className="hidden md:block sticky top-24 h-[calc(100vh-7rem)] rounded-[32px] border p-3 backdrop-blur-2xl"
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                boxShadow: theme.shellShadow,
              }}
            >
              <nav className="flex h-full flex-col gap-2">
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
                        boxShadow: isActive ? `${theme.buttonShadow}, inset 0 1px 0 rgba(255,255,255,0.12)` : 'none',
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{tab.label}</span>
                    </button>
                  );
                })}

                <div
                  className="mt-auto rounded-3xl border p-4"
                  style={{
                    background: theme.accentSurface,
                    borderColor: theme.line,
                    boxShadow: theme.panelShadow,
                  }}
                >
                  <div className="text-xs uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                    Performance
                  </div>
                  <div className="mt-2 text-3xl font-black" style={{ color: theme.text }}>
                    {thisWeekSessions}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                    workouts this week
                  </div>
                </div>
              </nav>
            </aside>

            <section
              className="min-w-0 overflow-hidden rounded-[32px] border px-2 py-2 backdrop-blur-2xl md:px-3 md:py-3"
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
                  {activeTab === 'home' && <HomeTab theme={theme} view="overview" />}
                  {activeTab === 'workout' && <HomeTab theme={theme} view="workout" />}
                  {activeTab === 'records' && <RecordsTab theme={theme} />}
                  {activeTab === 'body' && <BodyTab theme={theme} />}
                  {activeTab === 'settings' && (
                    <SettingsTab
                      theme={theme}
                      themeMode={themeMode}
                      setThemeMode={setThemeMode}
                      accentColor={accentColor}
                      setAccentColor={setAccentColor}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>
        </div>
      </main>

      <nav
        className="fixed bottom-3 left-3 right-3 z-50 rounded-[28px] border p-2 backdrop-blur-2xl md:hidden"
        style={{
          background: theme.shellBackground,
          borderColor: theme.shellBorder,
          boxShadow: theme.shellShadow,
        }}
      >
        <div className="grid h-16 grid-cols-5 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all"
                style={{
                  color: isActive ? theme.navActiveText : theme.navIdleText,
                  background: isActive ? theme.navActiveBackground : 'transparent',
                  boxShadow: isActive ? theme.buttonShadow : 'none',
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
