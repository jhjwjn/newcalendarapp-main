import React, { useState } from 'react';
import { useHealth } from '../../context/HealthContext';
import { Cloud, CloudOff, Loader2, User, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function HealthHeader() {
  const { syncState, user, signOut, manualSync } = useHealth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const isLocalMode = !user && localStorage.getItem('health_local_mode') === 'true';

  const getSyncIcon = () => {
    if (isLocalMode) {
      return <Cloud className="w-5 h-5 text-gray-400" />;
    }
    switch (syncState.status) {
      case 'syncing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'synced':
        return <Cloud className="w-5 h-5 text-green-600" />;
      case 'error':
        return <CloudOff className="w-5 h-5 text-red-600" />;
    }
  };

  const getSyncText = () => {
    if (isLocalMode) {
      return '로컬 모드';
    }
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
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">HEALTH</h1>
          <div className="flex items-center gap-2 text-sm">
            {getSyncIcon()}
            <span className="text-gray-600 hidden sm:inline">{getSyncText()}</span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700 hidden sm:inline">
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
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20"
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
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      수동 동기화
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={async () => {
                        await signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  )}
                  {isLocalMode && (
                    <button
                      onClick={() => {
                        localStorage.removeItem('health_local_mode');
                        window.location.reload();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
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
