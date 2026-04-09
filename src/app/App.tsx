import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { PlannerProvider } from './context/PlannerContext';
import { HealthProvider } from './context/HealthContext';
import { PlannerApp } from './components/planner/PlannerApp';
import { HealthApp } from './components/health/HealthApp';
import { AppToaster } from './lib/toast';

export default function App() {
  const [currentApp, setCurrentApp] = useState<'planner' | 'health'>('planner');

  const handleAppSwitch = (app: 'planner' | 'health') => {
    setCurrentApp(app);
  };

  return (
    <>
      <PlannerProvider>
        <HealthProvider>
          <LayoutGroup>
            <AnimatePresence mode="wait">
              {currentApp === 'planner' ? (
                <motion.div
                  key="planner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="size-full theme-transition"
                >
                  <div className="size-full">
                    <PlannerApp onSwitchApp={() => handleAppSwitch('health')} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="health"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="size-full theme-transition"
                >
                  <div className="size-full">
                    <HealthApp onSwitchApp={() => handleAppSwitch('planner')} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </HealthProvider>
      </PlannerProvider>
      <AppToaster />
    </>
  );
}
