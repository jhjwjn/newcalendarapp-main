import React, { useState } from 'react';
import { Cloud, CloudOff, Loader2, User, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { WorkspaceSwitchButton } from '../shared/WorkspaceSwitchButton';

interface PlannerHeaderProps {
  onSwitchApp?: () => void;
}

export function PlannerHeader({ onSwitchApp }: PlannerHeaderProps) {
  const { syncState, user, signOut, manualSync, settings } = usePlanner();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const theme = getPlannerTheme(settings);
  const isLocalMode = !user && localStorage.getItem('planner_local_mode') === 'true';

  const getSyncIcon = () => {
    if (isLocalMode) {
      return <Cloud className="h-4 w-4" style={{ color: theme.textMuted }} />;
    }
    switch (syncState.status) {
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin" style={{ color: theme.primary }} />;
      case 'synced':
        return <Cloud className="h-4 w-4" style={{ color: theme.tertiary }} />;
      case 'error':
        return <CloudOff className="h-4 w-4" style={{ color: theme.accent1 }} />;
    }
  };

  const getSyncText = () => {
    if (isLocalMode) return '로컬 모드';
    switch (syncState.status) {
      case 'syncing':
        return '동기화 중...';
      case 'synced':
        return '동기화 완료';
      case 'error':
        return '동기화 오류';
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-1.5 pt-1 md:px-5 md:pt-3">
      <div
        className="mx-auto flex h-10 md:h-16 max-w-[1600px] items-center justify-between rounded-2xl md:rounded-[28px] border px-2 md:px-4 backdrop-blur-2xl"
        style={{
          background: theme.shellBackground,
          borderColor: theme.shellBorder,
          boxShadow: theme.shellShadow,
        }}
      >
        <div className="flex items-center gap-2">
          <WorkspaceSwitchButton
            appName="planner"
            onClick={onSwitchApp}
            title="클릭하여 Health 앱으로 전환"
            textColor={theme.text}
            mutedColor={theme.textMuted}
          />

          <div
            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs sm:flex"
            style={{ background: theme.badgeBackground, color: theme.badgeText }}
          >
            {getSyncIcon()}
            <span>{getSyncText()}</span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors"
            style={{ background: theme.navBackground }}
          >
            <User className="h-4 w-4" style={{ color: theme.textSecondary }} />
            <span className="hidden text-xs sm:inline" style={{ color: theme.text }}>
              {user ? user.email?.split('@')[0] : '로컬 사용자'}
            </span>
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <motion.div
                  className="fixed inset-0 z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setShowUserMenu(false)}
                />
                <motion.div
                  className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border py-2 backdrop-blur-2xl"
                  style={{
                    background: theme.panelBackgroundStrong,
                    borderColor: theme.panelBorder,
                    boxShadow: theme.panelShadow,
                  }}
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  {!isLocalMode && (
                    <button
                      onClick={async () => {
                        await manualSync();
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
                      style={{ color: theme.textSecondary }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      수동 동기화
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={async () => {
                        await signOut();
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
                      style={{ color: theme.accent1 }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      로그아웃
                    </button>
                  )}
                  {isLocalMode && (
                    <button
                      onClick={() => {
                        localStorage.removeItem('planner_local_mode');
                        window.location.reload();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
                      style={{ color: theme.textSecondary }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      로그인 화면으로
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
