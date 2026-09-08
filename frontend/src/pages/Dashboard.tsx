// src/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  CreditCard, MessageSquare, Users, Calendar,
  TrendingUp, Megaphone, ArrowRight, ArrowUpRight,
  X, UserPlus, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import StatCard    from '@/components/dashboard/StatCard';
import { Button }  from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { toast }   from 'sonner';

const COLORS = [
  'hsl(173, 58%, 39%)',
  'hsl(160, 60%, 45%)',
  'hsl(197, 71%, 52%)',
  'hsl(215, 80%, 50%)',
  'hsl(262, 83%, 58%)',
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border:          '1px solid hsl(var(--border))',
    borderRadius:    '8px',
    fontSize:        '12px',
  },
};

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
interface AddLeadModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', source: '', email: '', phone: '',
    property: '', budget: '', assigned_to: '', status: 'new',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/leads', form);
      toast.success('Lead added');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground text-sm';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl shadow-2xl z-50 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Add New Lead</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name"        value={form.name}        onChange={onChange} placeholder="Name *"      required className={inputCls} />
          <input name="phone"       value={form.phone}       onChange={onChange} placeholder="Phone"       type="tel"   className={inputCls} />
          <input name="email"       value={form.email}       onChange={onChange} placeholder="Email"       type="email" className={inputCls} />
          <input name="source"      value={form.source}      onChange={onChange} placeholder="Source"      className={inputCls} />
          <input name="property"    value={form.property}    onChange={onChange} placeholder="Property"    className={inputCls} />
          <input name="budget"      value={form.budget}      onChange={onChange} placeholder="Budget"      className={inputCls} />
          <input name="assigned_to" value={form.assigned_to} onChange={onChange} placeholder="Assigned To" className={inputCls} />
          <select name="status" value={form.status} onChange={onChange} className={inputCls}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="interested">Interested</option>
          </select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={saving}>
              {saving ? 'Saving…' : 'Save Lead'}
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
};


// ─── Skeleton card ────────────────────────────────────────────────────────────
const Skel = ({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) => (
  <div className={`${h} ${w} bg-muted/50 rounded animate-pulse`} />
);


// ═════════════════════════════════════════════════════════════════════════════
// Dashboard
// ═════════════════════════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showAddLead, setShowAddLead] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [tenantName, setTenantName]   = useState('');

  const [stats,                setStats]                = useState<any>(null);
  const [weeklyChartData,      setWeeklyChartData]      = useState<any[]>([]);
  const [monthlyChartData,     setMonthlyChartData]     = useState<any[]>([]);
  const [leadSourceData,       setLeadSourceData]       = useState<any[]>([]);
  const [recentLeads,          setRecentLeads]          = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [activeCampaigns,      setActiveCampaigns]      = useState<any[]>([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/reports/dashboard');
      if (!data.success) throw new Error(data.error);
      setStats(data.stats);
      setWeeklyChartData(data.weeklyChartData);
      setMonthlyChartData(data.monthlyChartData);
      setLeadSourceData(data.leadSourceData);
      setRecentLeads(data.recentLeads);
      setUpcomingAppointments(data.upcomingAppointments);
      setActiveCampaigns(data.activeCampaigns);
      // Tenant name from JWT — pull from /api/auth/me or pass via context
    } catch (err: any) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Also fetch tenant name for greeting
  useEffect(() => {
    axios.get('/api/auth/me').then(r => setTenantName(r.data?.tenant?.name ?? '')).catch(() => {});
  }, []);

  const container = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="visible">

      {/* ── Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back{tenantName ? `, ${tenantName}` : ''} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here's what's happening with your campaigns today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => navigate('/campaigns', { state: { openNewCampaign: true } })}
          >
            <Megaphone className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Credits Balance"
          value={loading ? '…' : stats?.credits?.toLocaleString() ?? '0'}
          change="+12%" changeType="positive"
          icon={CreditCard} description="current balance"
        />
        <StatCard
          title="Messages Sent"
          value={loading ? '…' : stats?.messagesSent?.toLocaleString() ?? '0'}
          change="+8.2%" changeType="positive"
          icon={MessageSquare} description="this month"
        />
        <StatCard
          title="New Leads"
          value={loading ? '…' : stats?.newLeads ?? 0}
          change="+15%" changeType="positive"
          icon={Users} description="this week"
        />
        <StatCard
          title="Appointments"
          value={loading ? '…' : stats?.upcomingAppointments ?? 0}
          icon={Calendar} description="upcoming"
        />
      </motion.div>

      {/* ── Charts Row 1 ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weekly Messages Area Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground">Messages Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days — sent vs received</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Sent</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(197, 71%, 52%)' }} /> Received</span>
            </div>
          </div>
          <div className="h-[260px]">
            {loading ? (
              <div className="h-full flex items-end gap-1 pb-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-muted/40 rounded-t animate-pulse" style={{ height: `${40 + Math.random() * 50}%` }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyChartData}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(197, 71%, 52%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(197, 71%, 52%)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="value"  stroke="hsl(173, 58%, 39%)" strokeWidth={2} fill="url(#gradSent)"     name="Sent"     />
                  <Area type="monotone" dataKey="value2" stroke="hsl(197, 71%, 52%)" strokeWidth={2} fill="url(#gradReceived)" name="Received" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Sources Pie */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Lead Sources</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Where your leads come from</p>
          </div>
          <div className="h-[180px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-8 border-muted/40 animate-pulse" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                    {leadSourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {(loading ? Array.from({ length: 4 }) : leadSourceData.slice(0, 4)).map((item: any, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {loading
                  ? <Skel h="h-3" w="w-full" />
                  : <>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                      <span className="text-xs font-semibold ml-auto tabular-nums">{item.value}</span>
                    </>
                }
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Lists Row ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Leads */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Leads</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-8 px-2"
                onClick={() => setShowAddLead(true)}>
                <UserPlus className="w-4 h-4 mr-1" /> Add
              </Button>
              <Link to="/leads">
                <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                  All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5"><Skel h="h-3" w="w-3/4" /><Skel h="h-2.5" w="w-1/2" /></div>
                  </div>
                ))
              : recentLeads.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">No new leads</p>
                : recentLeads.map((lead, i) => (
                    <motion.div key={lead.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.property || lead.phone || lead.source || '—'}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">New</span>
                    </motion.div>
                  ))
            }
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Upcoming Appointments</h3>
            <Link to="/appointments">
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5"><Skel h="h-3" w="w-3/4" /><Skel h="h-2.5" w="w-1/2" /></div>
                  </div>
                ))
              : upcomingAppointments.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments</p>
                : upcomingAppointments.map((apt, i) => (
                    <motion.div key={apt.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex flex-col items-center justify-center text-xs flex-shrink-0">
                        <span className="font-bold text-foreground leading-none">
                          {new Date(apt.date).getDate()}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(apt.date).toLocaleDateString('en', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{apt.leadName}</p>
                        <p className="text-xs text-muted-foreground">{apt.time} · {apt.type}</p>
                      </div>
                    </motion.div>
                  ))
            }
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Active Campaigns</h3>
            <Link to="/campaigns">
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 border border-border rounded-lg space-y-2">
                    <Skel h="h-3" w="w-2/3" /><Skel h="h-2.5" w="w-1/2" />
                  </div>
                ))
              : activeCampaigns.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">No active campaigns</p>
                : activeCampaigns.map((c, i) => {
                    const openPct = c.messagesSent > 0
                      ? Math.round((c.opens / c.messagesSent) * 100) : 0;
                    return (
                      <motion.div key={c.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">{c.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium ml-2 flex-shrink-0">Active</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {c.messagesSent.toLocaleString()} sent
                          </span>
                          {c.messagesSent > 0 && (
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3" />
                              {openPct}% open
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
            }
          </div>
        </div>
      </motion.div>

      {/* ── Monthly Performance Bar Chart ── */}
      <motion.div variants={item} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-foreground">Monthly Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Messages sent and received over 6 months</p>
          </div>
          {stats && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {stats.conversionRate}% conversion
              </span>
            </div>
          )}
        </div>
        <div className="h-[260px]">
          {loading ? (
            <div className="h-full flex items-end gap-2 pb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-1 bg-muted/40 rounded-t animate-pulse" style={{ height: `${35 + Math.random() * 55}%` }} />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value"  fill="hsl(173, 58%, 39%)" radius={[3,3,0,0]} name="Sent"     />
                <Bar dataKey="value2" fill="hsl(197, 71%, 52%)" radius={[3,3,0,0]} name="Received" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ── Add Lead Modal ── */}
      <AnimatePresence>
        {showAddLead && (
          <AddLeadModal onClose={() => setShowAddLead(false)} onSaved={fetchDashboard} />
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default Dashboard;