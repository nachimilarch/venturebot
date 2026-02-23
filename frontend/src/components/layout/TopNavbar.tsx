import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Bell, Search, CreditCard, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TopNavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onMobileMenuToggle: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ 
  sidebarOpen, 
  onToggleSidebar, 
  onMobileMenuToggle 
}) => {
  const { tenant, dashboardStats } = useTenant();

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center gap-4 sticky top-0 z-30">
      {/* Mobile Menu Button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop Sidebar Toggle */}
      <button
        onClick={onToggleSidebar}
        className="hidden lg:flex p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeft className="w-5 h-5" />
        )}
      </button>

      {/* Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search leads, campaigns..." 
          className="pl-10 bg-muted/50 border-transparent focus:border-border focus:bg-background"
        />
      </div>

      <div className="flex-1 md:hidden" />

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Credits Badge */}
        <motion.div 
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-tenant-accent-light"
          whileHover={{ scale: 1.02 }}
        >
          <CreditCard className="w-4 h-4 tenant-accent-text" />
          <span className="text-sm font-semibold tenant-accent-text">
            {dashboardStats?.credits?.toLocaleString() || 0}
          </span>
          <span className="text-xs text-muted-foreground">credits</span>
        </motion.div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-tenant-accent flex items-center justify-center text-sm">
            {tenant?.logo || '🏠'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
