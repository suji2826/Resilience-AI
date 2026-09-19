import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { DemoFloatingBanner } from '../components/layout/DemoFloatingBanner';
import { CopilotDrawer } from '../components/copilot/CopilotDrawer';
import { SyntheticDataBanner } from '../components/common/CommonUI';
import { api } from '../lib/api';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check emergency state
    api.getEmergencyStatus()
      .then(res => setIsEmergencyActive(res.is_active))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-command-bg dark:bg-navy-950 text-command-text dark:text-white flex flex-col font-sans selection:bg-tomato-500 selection:text-white transition-colors">
      {/* Persistent Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCopilot={() => setCopilotOpen(true)}
          isEmergencyActive={isEmergencyActive}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 lg:p-6 space-y-5 max-w-7xl w-full mx-auto pb-24 overflow-x-hidden">
          <SyntheticDataBanner />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Components */}
        <DemoFloatingBanner />
        <CopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      </div>
    </div>
  );
};
