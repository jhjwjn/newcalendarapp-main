import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react';
import { subscribeToToasts, dismiss, ToastItem } from '../../lib/notification';
import { usePlanner } from '../../context/PlannerContext';
import { getPlannerTheme } from '../../lib/plannerTheme';

function NotificationCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { settings } = usePlanner();
  const theme = getPlannerTheme(settings);

  const iconMap = {
    success: <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />,
    error: <XCircle className="h-4 w-4 shrink-0" style={{ color: theme.accent1 || '#ef4444' }} />,
    info: <Info className="h-4 w-4 shrink-0" style={{ color: theme.primary }} />,
    loading: <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: theme.primary }} />,
  };

  const borderColorMap = {
    success: '#22c55e40',
    error: `${theme.accent1}40`,
    info: `${theme.primary}40`,
    loading: `${theme.primary}30`,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg"
      style={{
        background: settings.isDarkMode
          ? `${theme.panelBackgroundStrong}`
          : `rgba(255,255,255,0.96)`,
        borderColor: borderColorMap[item.type],
        boxShadow: `0 8px 32px rgba(0,0,0,${settings.isDarkMode ? '0.4' : '0.12'})`,
        backdropFilter: 'blur(16px)',
        minWidth: '240px',
        maxWidth: '360px',
      }}
    >
      {iconMap[item.type]}
      <span className="flex-1 text-sm font-medium" style={{ color: theme.text }}>
        {item.message}
      </span>
      <button
        onClick={onDismiss}
        className="rounded-full p-0.5 transition-opacity hover:opacity-70"
        style={{ color: theme.textMuted }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export function AppNotificationHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToToasts(setItems);
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-28 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-8"
      style={{ width: 'max-content' }}
    >
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <NotificationCard item={item} onDismiss={() => dismiss(item.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
