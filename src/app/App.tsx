import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { PlannerProvider } from './context/PlannerContext';
import { HealthProvider } from './context/HealthContext';
import { PlannerApp } from './components/planner/PlannerApp';
import { HealthApp } from './components/health/HealthApp';
import { AppToaster } from './lib/toast';

export default function App() {
  const [currentApp, setCurrentApp] = useState<'planner' | 'health'>('planner');
  const [themeKey, setThemeKey] = useState(0);

  const handleAppSwitch = (app: 'planner' | 'health') => {
    setThemeKey(prev => prev + 1);
    setCurrentApp(app);
  };

  return (
    <>
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {currentApp === 'planner' ? (
            <motion.div
              key={`planner-${themeKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="size-full theme-transition"
            >
              <PlannerProvider>
                <div className="size-full">
                  <PlannerApp onSwitchApp={() => handleAppSwitch('health')} />
                </div>
              </PlannerProvider>
            </motion.div>
          ) : (
            <motion.div
              key={`health-${themeKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="size-full theme-transition"
            >
              <HealthProvider>
                <div className="size-full">
                  <HealthApp onSwitchApp={() => handleAppSwitch('planner')} />
                </div>
              </HealthProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
      <AppToaster />
    </>
  );
}
