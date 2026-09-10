// components/AppSidebar.tsx
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Megaphone, MessageSquare, Users,
  Calendar, BarChart3, CreditCard, Settings, LogOut,
  X, ChevronRight, Terminal, BookUser, Inbox,
  GitBranch, Workflow, UserCog, HelpCircle, FileText,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  onClose:    () => void;
  onShowGuide?: () => void;
}

interface NavItem {
  name:   string;
  href:   string;
  icon:   React.ElementType;
  roles?: string[];
  group?: string;
}

const NAVIGATION: NavItem[] = [
  { name: 'Dashboard',       href: '/dashboard',    icon: LayoutDashboard, group: 'core' },
  { name: 'Inbox',           href: '/inbox',         icon: Inbox,           group: 'core' },
  { name: 'Contacts',        href: '/contacts',      icon: BookUser,        group: 'core' },

  { name: 'Campaigns',       href: '/campaigns',     icon: Megaphone,       group: 'marketing' },
  { name: 'Bulk Messaging',  href: '/messaging',     icon: MessageSquare,   group: 'marketing' },
  { name: 'Drip Sequences',  href: '/drip',          icon: GitBranch,       group: 'marketing' },

  { name: 'Leads',           href: '/leads',         icon: Users,           group: 'crm' },
  { name: 'Appointments',    href: '/appointments',  icon: Calendar,        group: 'crm' },

  { name: 'Flow Builder',    href: '/flow-builder',  icon: Workflow,        group: 'automation' },
  { name: 'Templates',       href: '/templates',     icon: FileText,        group: 'automation' },
  { name: 'Reports',         href: '/reports',       icon: BarChart3,       group: 'automation' },

  { name: 'Team',            href: '/staff',         icon: UserCog,         group: 'admin', roles: ['admin'] },
  { name: 'Billing',         href: '/billing',       icon: CreditCard,      group: 'admin', roles: ['admin'] },
  { name: 'Settings',        href: '/settings',      icon: Settings,        group: 'admin', roles: ['admin'] },
  { name: 'API Reference',   href: '/api-docs',      icon: Terminal,        group: 'admin', roles: ['admin'] },
];

const GROUP_LABELS: Record<string, string> = {
  core: 'Workspace',
  marketing: 'Marketing',
  crm: 'CRM',
  automation: 'Automation',
  admin: 'Admin',
};

const AppSidebar: React.FC<AppSidebarProps> = ({ onClose, onShowGuide }) => {
  const { tenant }          = useTenant();
  const { logout, user }    = useAuth();
  const location            = useLocation();
  const navigate            = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visible = NAVIGATION.filter(
    item => !item.roles || item.roles.includes(user?.role || 'admin')
  );

  const groups = [...new Set(visible.map(i => i.group!))];

  return (
    <div className={cn(
      'fixed inset-y-0 left-0 z-40',
      'w-[272px] flex flex-col',
      'border-r border-sidebar-border',
    )} style={{ background: 'hsl(var(--sidebar-background))' }}>

      {/* ── Brand header ──────────────────────────────────── */}
      <div className="shrink-0 px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo mark */}
            {tenant?.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-white/10">
                {/* VaartaBot chat bubble mark */}
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 2C6.03 2 2 5.58 2 10C2 12.62 3.38 14.95 5.55 16.45L4.5 20L8.5 18.2C9.3 18.42 10.14 18.55 11 18.55C15.97 18.55 20 14.97 20 10.28C20 5.58 15.97 2 11 2Z"
                        fill="url(#vbGrad)"/>
                  <circle cx="7.5" cy="10" r="1.3" fill="white" fillOpacity="0.9"/>
                  <circle cx="11" cy="10" r="1.3" fill="white" fillOpacity="0.9"/>
                  <circle cx="14.5" cy="10" r="1.3" fill="white" fillOpacity="0.9"/>
                  <defs>
                    <linearGradient id="vbGrad" x1="2" y1="2" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#2EC4C0"/>
                      <stop offset="100%" stopColor="#4A3694"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            <div className="min-w-0">
              <h2 className="font-bold text-sidebar-foreground truncate leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px', letterSpacing: '-0.02em' }}>
                {tenant?.name || 'VaartaBot'}
              </h2>
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'hsl(220 20% 55%)' }}>
                by Milarch Tech
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden shrink-0 p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
        {groups.map((group, gi) => {
          const items = visible.filter(i => i.group === group);
          return (
            <div key={group} className={cn('px-3', gi > 0 && 'mt-4')}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                 style={{ color: 'hsl(220 20% 40%)' }}>
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-0.5">
                {items.map((item, index) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (gi * 4 + index) * 0.03, duration: 0.25 }}
                    >
                      <NavLink
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-foreground'
                            : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                        )}
                      >
                        <item.icon className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground/70'
                        )} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {isActive && <ChevronRight className="w-3 h-3 text-sidebar-primary shrink-0" />}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-sidebar-border">

        {/* Getting Started button */}
        {onShowGuide && (
          <div className="px-3 pt-3">
            <button
              onClick={onShowGuide}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={{ color: 'hsl(var(--sidebar-primary))', background: 'hsl(220 73% 62% / 0.12)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220 73% 62% / 0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'hsl(220 73% 62% / 0.12)')}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              Getting started guide
            </button>
          </div>
        )}

        {/* User row */}
        <div className="p-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
               style={{ background: 'hsl(220 53% 12%)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                 style={{ background: 'linear-gradient(135deg, hsl(220 73% 55%), hsl(var(--tenant-accent)))' }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] truncate capitalize mt-0.5" style={{ color: 'hsl(220 20% 50%)' }}>
                {user?.role || 'Admin'}
              </p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: 'hsl(220 20% 45%)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(220 20% 45%)'; }}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Milarch Tech attribution — real logo */}
          <div className="mt-2 px-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                 style={{ background: 'hsl(252 45% 12%)' }}>
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/milarch-logo.png" alt="Milarch Tech" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', fontWeight: 700, color: 'hsl(252 20% 65%)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Powered by
                </p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', fontWeight: 700, color: 'hsl(178 55% 55%)', letterSpacing: '-0.01em', lineHeight: '1' }}>
                  Milarch Tech
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
