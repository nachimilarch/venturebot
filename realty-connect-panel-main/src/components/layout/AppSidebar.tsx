import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Megaphone, 
  MessageSquare, 
  Users, 
  Calendar, 
  BarChart3, 
  CreditCard, 
  Settings,
  LogOut,
  X,
  ChevronRight
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Bulk Messaging', href: '/messaging', icon: MessageSquare },
  { name: 'Leads CRM', href: '/leads', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ onClose }) => {
  const { tenant } = useTenant();
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-[280px] bg-sidebar flex flex-col border-r border-sidebar-border shadow-sidebar">
      {/* Header */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center text-xl">
              {tenant?.logo || '🏠'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sidebar-foreground truncate text-sm">
                {tenant?.name || 'Loading...'}
              </h2>
              <p className="text-xs text-sidebar-muted truncate">
                {tenant?.industry || 'Real Estate'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NavLink
                to={item.href}
                onClick={() => onClose()}
                className={cn(
                  'sidebar-item group',
                  isActive && 'sidebar-item-active'
                )}
              >
                <item.icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                )} />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-sidebar-primary" />
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sm font-medium text-sidebar-primary-foreground">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-muted truncate capitalize">
              {user?.role || 'Admin'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
