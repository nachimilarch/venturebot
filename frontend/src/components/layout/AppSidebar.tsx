// components/AppSidebar.tsx
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
  ChevronRight,
  Zap,
  Terminal,
  BookUser,
  Inbox,
  GitBranch,
  Workflow,
  UserCog,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  onClose: () => void;
}

interface NavItem {
  name:   string;
  href:   string;
  icon:   React.ElementType;
  roles?: string[];  // if set, only visible to these roles
}

const NAVIGATION: NavItem[] = [
  { name: 'Dashboard',       href: '/dashboard',     icon: LayoutDashboard },
  { name: 'Campaigns',       href: '/campaigns',     icon: Megaphone },
  { name: 'Bulk Messaging',  href: '/messaging',     icon: MessageSquare },
  { name: 'Inbox',           href: '/inbox',         icon: Inbox },
  { name: 'Contacts',        href: '/contacts',      icon: BookUser },
  { name: 'Drip Sequences',  href: '/drip',          icon: GitBranch },
  { name: 'Leads',           href: '/leads',         icon: Users },
  { name: 'Appointments',    href: '/appointments',  icon: Calendar },
  { name: 'Flow Builder',    href: '/flow-builder',  icon: Workflow },
  { name: 'Reports',         href: '/reports',       icon: BarChart3 },
  { name: 'Team',            href: '/staff',         icon: UserCog,  roles: ['admin'] },
  { name: 'Billing',         href: '/billing',       icon: CreditCard, roles: ['admin'] },
  { name: 'Settings',        href: '/settings',      icon: Settings, roles: ['admin'] },
  { name: 'API Reference',   href: '/api-docs',      icon: Terminal, roles: ['admin'] },
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
    // ── Outer shell ──────────────────────────────────────────────────────────
    // fixed + inset-y-0 + left-0 makes the sidebar stick to the left edge
    // of the viewport at all times, completely independent of page scroll.
    // On mobile it overlays the content; on lg+ it sits alongside it.
    // The parent layout must add lg:pl-[280px] to the main content wrapper
    // so content isn't hidden behind the sidebar.
    <div className={cn(
      'fixed inset-y-0 left-0 z-40',
      'w-[280px] bg-sidebar',
      'flex flex-col',
      'border-r border-sidebar-border shadow-sidebar',
    )}>

      {/* ── Brand header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 p-5 border-b border-sidebar-border">
        <div className="flex items-center justify-between">

          {/* Logo + tenant name */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Tenant logo if set, otherwise VaartaBot default icon */}
            {tenant?.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="w-10 h-10 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-tenant-accent flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="font-semibold text-sidebar-foreground truncate text-sm leading-tight">
                {tenant?.name || 'VaartaBot'}
              </h2>
              <p className="text-xs text-sidebar-muted truncate mt-0.5">
                {tenant?.industry || 'WhatsApp Automation'}
              </p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden shrink-0 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      {/* overflow-y-auto here: if nav items overflow (many items / small screen)
          only the nav list scrolls, not the entire sidebar. Header & footer
          remain always visible. */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAVIGATION.filter(item => !item.roles || item.roles.includes(user?.role || 'admin')).map((item, index) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              <NavLink
                to={item.href}
                onClick={onClose}
                className={cn(
                  // Base styles
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  // Inactive
                  'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
                  // Active
                  isActive && 'bg-sidebar-accent text-sidebar-foreground shadow-sm',
                )}
              >
                <item.icon className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-colors',
                  isActive
                    ? 'text-tenant-accent'
                    : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                )} />

                <span className="flex-1 truncate">{item.name}</span>

                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-tenant-accent shrink-0" />
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* ── User / logout footer ──────────────────────────────────────────── */}
      {/* shrink-0 prevents this from being squished when nav overflows */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/40">

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-tenant-accent flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-muted truncate capitalize mt-0.5">
              {user?.role || 'Admin'}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="shrink-0 p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-red-400 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;