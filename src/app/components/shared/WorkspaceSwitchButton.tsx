import React from 'react';
import { motion } from 'motion/react';

interface WorkspaceSwitchButtonProps {
  appName: 'planner' | 'workout';
  onClick?: () => void;
  title?: string;
  textColor: string;
  mutedColor: string;
}

export function WorkspaceSwitchButton({
  appName,
  onClick,
  title,
  textColor,
  mutedColor,
}: WorkspaceSwitchButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-2xl px-3 py-2 text-left transition-opacity hover:opacity-85"
    >
      <div className="overflow-hidden text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: mutedColor }}>
        <motion.div layoutId="workspace-label">Workspace</motion.div>
      </div>
      <div className="overflow-hidden text-lg font-semibold" style={{ color: textColor }}>
        <motion.div
          key={appName}
          layoutId="workspace-app-name"
          initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {appName === 'planner' ? 'Planner' : 'Workout'}
        </motion.div>
      </div>
    </button>
  );
}
