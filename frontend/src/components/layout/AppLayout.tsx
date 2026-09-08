import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopNavbar from './TopNavbar';
import OnboardingWizard, { OnboardingTrigger } from '@/components/OnboardingWizard';
import { motion, AnimatePresence } from 'framer-motion';

const AppLayout: React.FC = () => {
  const { tenantId } = useAuth();
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen]           = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background" data-tenant={tenantId}>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 272, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <AppSidebar onClose={() => setSidebarOpen(false)} onShowGuide={() => setGuideOpen(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -272 }} animate={{ x: 0 }} exit={{ x: -272 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[272px] lg:hidden"
            >
              <AppSidebar onClose={() => setMobileSidebarOpen(false)} onShowGuide={() => { setMobileSidebarOpen(false); setGuideOpen(true); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onShowGuide={() => setGuideOpen(true)}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Step-by-step guide modal */}
      <OnboardingWizard open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Bottom-right trigger for new users */}
      <OnboardingTrigger onClick={() => setGuideOpen(true)} />
    </div>
  );
};

export default AppLayout;
