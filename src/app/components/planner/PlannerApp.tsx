import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Calendar, Zap, BookOpen, FileText, BarChart3, Settings } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { PlannerHeader } from './PlannerHeader';
import { HomeTab } from './tabs/HomeTab_StyleB_Glass';
import { CalendarTab } from './tabs/CalendarTab';
import { HabitsTab } from './tabs/HabitsTab';
import { StudyTab } from './tabs/StudyTab';
import { NotesTab } from './tabs/NotesTab';
import { StatsTab } from './tabs/StatsTab';
import { SettingsTab } from './tabs/SettingsTab';

type TabType = 'home' | 'calendar' | 'habits' | 'study' | 'notes' | 'stats' | 'settings';

const tabs = [
  { id: 'home' as TabType, label: '홈', icon: Home },
  { id: 'calendar' as TabType, label: '캘린더', icon: Calendar },
  { id: 'habits' as TabType, label: '습관', icon: Zap },
  { id: 'study' as TabType, label: '학습', icon: BookOpen },
  { id: 'notes' as TabType, label: '메모', icon: FileText },
  { id: 'stats' as TabType, label: '통계', icon: BarChart3 },
  { id: 'settings' as TabType, label: '설정', icon: Settings },
];

// 모바일 하단 탭 (6개로 줄임)
const mobileTabs = tabs.filter(t => t.id !== 'stats');

interface PlannerAppProps {
  onSwitchApp?: () => void;
}

export function PlannerApp({ onSwitchApp }: PlannerAppProps) {
  const { settings } = usePlanner();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const theme = getPlannerTheme(settings);

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <HomeTab onNavigate={setActiveTab} />;
      case 'calendar': return <CalendarTab />;
      case 'habits': return <HabitsTab />;
      case 'study': return <StudyTab />;
      case 'notes': return <NotesTab />;
      case 'stats': return <StatsTab />;
      case 'settings': return <SettingsTab />;
      default: return <HomeTab onNavigate={setActiveTab} />;
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: theme.pageBackground, color: theme.text }}
    >
      {/* 배경 블러 블롭 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-24 left-[6%] h-72 w-72 rounded-full blur-3xl opacity-60"
          style={{ background: `${theme.primary}22` }}
        />
        <div
          className="absolute top-[18%] right-[10%] h-80 w-80 rounded-full blur-3xl opacity-50"
          style={{ background: `${theme.accent1}1e` }}
        />
        <div
          className="absolute bottom-[8%] left-[28%] h-96 w-96 rounded-full blur-3xl opacity-40"
          style={{ background: `${theme.tertiary}18` }}
        />
      </div>

      <PlannerHeader onSwitchApp={onSwitchApp} />

      <main className="relative z-10 pb-24 md:pb-8">
        <div className="mx-auto max-w-[1600px] px-0 pt-24 md:px-5 md:pt-24">
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
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150 hover:opacity-90"
                      style={{
                        background: isActive ? theme.navActiveBackground : 'transparent',
                        color: isActive ? theme.navActiveText : theme.navIdleText,
                        boxShadow: isActive
                          ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 20px ${theme.primary}20`
                          : 'none',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* 테마 미리보기 */}
              <div
                className="mt-3 rounded-2xl border p-4"
                style={{ background: theme.navBackground, borderColor: theme.line }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: theme.textMuted }}
                >
                  Theme
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: theme.primary }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: theme.accent1 }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: theme.secondary }} />
                  <span className="text-xs ml-1 font-medium" style={{ color: theme.textSecondary }}>
                    {settings.isDarkMode ? 'Dark' : 'Light'}
                  </span>
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  {renderTab()}
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
        <div className="grid h-14 gap-0.5" style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, 1fr)` }}>
          {mobileTabs.map(tab => {
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
