import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Calendar, BookOpen, FileText, BarChart3, Settings, RefreshCw, Mic, PenTool } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { LoginScreen } from './LoginScreen';
import { PlannerHeader } from './PlannerHeader';
import { HomeTab } from './tabs/HomeTab_StyleB_Glass';
import { CalendarTab } from './tabs/CalendarTab';
import { StudyTab } from './tabs/StudyTab';
import { NotesTab } from './tabs/NotesTab';
import { StatsTab } from './tabs/StatsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { AIFloatingButton } from '../shared/AIFloatingButton';
import { QuickAddButton } from '../shared/QuickAddButton';
import { RepeatScheduleModal } from './RepeatScheduleModal';

type TabType = 'home' | 'calendar' | 'study' | 'notes' | 'stats' | 'settings';

const tabs = [
  { id: 'home' as TabType, label: '홈', icon: Home },
  { id: 'calendar' as TabType, label: '캘린더', icon: Calendar },
  { id: 'study' as TabType, label: '학습', icon: BookOpen },
  { id: 'notes' as TabType, label: '메모', icon: FileText },
  { id: 'stats' as TabType, label: '통계', icon: BarChart3 },
  { id: 'settings' as TabType, label: '설정', icon: Settings },
];

interface PlannerAppProps {
  onSwitchApp?: () => void;
}

export function PlannerApp({ onSwitchApp }: PlannerAppProps) {
  const { session, settings } = usePlanner();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [localMode, setLocalMode] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const theme = getPlannerTheme(settings);

  React.useEffect(() => {
    const isLocalMode = localStorage.getItem('planner_local_mode') === 'true';
    setLocalMode(isLocalMode);
  }, []);

  React.useEffect(() => {
    document.body.className = `theme-${settings.theme}`;
    document.body.style.background = theme.pageBackground;
    document.body.style.color = theme.text;
  }, [settings.theme, theme.pageBackground, theme.text]);

  if (!session && !localMode) {
    return (
      <LoginScreen
        onLocalMode={() => {
          localStorage.setItem('planner_local_mode', 'true');
          setLocalMode(true);
        }}
      />
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab onNavigate={setActiveTab} />;
      case 'calendar':
        return <CalendarTab showRepeatModal={showRepeatModal} setShowRepeatModal={setShowRepeatModal} />;
      case 'study':
        return <StudyTab />;
      case 'notes':
        return <NotesTab />;
      case 'stats':
        return <StatsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <HomeTab onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: theme.pageBackground, color: theme.text }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[6%] h-72 w-72 rounded-full blur-3xl" style={{ background: `${theme.primary}22` }} />
        <div className="absolute top-[18%] right-[10%] h-80 w-80 rounded-full blur-3xl" style={{ background: `${theme.accent1}1e` }} />
        <div className="absolute bottom-[8%] left-[28%] h-96 w-96 rounded-full blur-3xl" style={{ background: `${theme.tertiary}18` }} />
      </div>

      <PlannerHeader onSwitchApp={onSwitchApp} />

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
                        boxShadow: isActive ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px ${theme.primary}1f` : 'none',
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{tab.label}</span>
                    </button>
                  );
                })}

                <div className="mt-auto rounded-3xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
                  <div className="text-xs uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                    Current Theme
                  </div>
                  <div className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                    {settings.isDarkMode ? 'Night Glass' : 'Day Glass'}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: theme.primary }} />
                    <div className="h-3 w-3 rounded-full" style={{ background: theme.secondary }} />
                    <div className="h-3 w-3 rounded-full" style={{ background: theme.accent1 }} />
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderTab()}
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
        <div className="grid h-16 grid-cols-6 gap-1">
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
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <QuickAddButton />
      <AIFloatingButton />
      <RepeatScheduleModal isOpen={showRepeatModal} onClose={() => setShowRepeatModal(false)} />
      
      {activeTab === 'study' && (
        <StudyTabModeNav />
      )}
    </div>
  );
}

function StudyTabModeNav() {
  const { settings, studyMode, setStudyMode } = usePlanner();
  const theme = getPlannerTheme(settings);
  
  const modeTabs = [
    { id: 'flashcard' as const, label: '카드', icon: BookOpen },
    { id: 'review' as const, label: '복습', icon: RefreshCw },
    { id: 'opic' as const, label: 'OPIC', icon: Mic },
    { id: 'writing' as const, label: '글쓰기', icon: PenTool },
    { id: 'history' as const, label: '기록', icon: BarChart3 },
  ];

  return (
    <div 
      className="fixed bottom-20 left-3 right-3 z-[55] rounded-2xl border p-1.5 backdrop-blur-2xl md:hidden"
      style={{ background: theme.shellBackground, borderColor: theme.panelBorder }}
    >
      <div className="flex justify-around">
        {modeTabs.map(tab => {
          const Icon = tab.icon;
          const active = studyMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStudyMode(tab.id)}
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium"
              style={{
                background: active ? theme.panelBackgroundStrong : 'transparent',
                color: active ? theme.primary : theme.textMuted,
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
