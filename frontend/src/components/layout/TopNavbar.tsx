import React from 'react';
import { motion } from 'framer-motion';
import { Menu, CreditCard, PanelLeftClose, PanelLeft, BookOpen, Sparkles } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/inbox':        'Inbox',
  '/contacts':     'Contacts',
  '/campaigns':    'Campaigns',
  '/messaging':    'Bulk Messaging',
  '/drip':         'Drip Sequences',
  '/leads':        'Leads',
  '/appointments': 'Appointments',
  '/flow-builder': 'Flow Builder',
  '/reports':      'Reports',
  '/staff':        'Team',
  '/billing':      'Billing',
  '/settings':     'Settings',
  '/api-docs':     'API Reference',
};

interface TopNavbarProps {
  sidebarOpen:       boolean;
  onToggleSidebar:   () => void;
  onMobileMenuToggle: () => void;
  onShowGuide?:      () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  sidebarOpen, onToggleSidebar, onMobileMenuToggle, onShowGuide,
}) => {
  const { dashboardStats } = useTenant();
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] ?? '';

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-5 flex items-center gap-3 sticky top-0 z-30">

      {/* Mobile menu */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="hidden lg:flex p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      {/* Page title */}
      {pageTitle && (
        <h1 className="text-[15px] font-semibold text-foreground hidden sm:block"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
          {pageTitle}
        </h1>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* AI badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
             style={{ background: 'hsl(262 83% 58% / 0.1)', color: 'hsl(262 83% 58%)' }}>
          <Sparkles className="w-3 h-3" />
          <span>AI-powered</span>
        </div>

        {/* Credits */}
        <motion.div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'hsl(var(--tenant-accent-light))', color: 'hsl(var(--tenant-accent))' }}
          whileHover={{ scale: 1.03 }}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{dashboardStats?.credits?.toLocaleString() || 0}</span>
          <span className="font-normal opacity-70">credits</span>
        </motion.div>

        {/* Guide button */}
        {onShowGuide && (
          <button
            onClick={onShowGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:bg-muted"
            style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.3)' }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
