// src/pages/Reports.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Download, Calendar, TrendingUp, TrendingDown,
  Users, MessageSquare, Target, CheckCircle,
  RefreshCw, PhoneCall, Send, MailOpen,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { Button }   from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';


// ─── Palette (teal-first, matches your Nexus design system) ──────────────────
const CHART_COLORS = {
  primary:   'hsl(173, 58%, 39%)',
  secondary: 'hsl(197, 71%, 52%)',
  success:   'hsl(142, 55%, 45%)',
  warning:   'hsl(38,  90%, 50%)',
  error:     'hsl(0,   72%, 51%)',
  muted:     'hsl(215, 16%, 60%)',
};
const PIE_COLORS = Object.values(CHART_COLORS);

type DateRange = '7d' | '30d' | '90d' | '1y';

interface Summary {
  messagesSent:     number;
  messagesReceived: number;
  messagesFailed:   number;
  deliveredRate:    number;
  readRate:         number;
  uniqueContacts:   number;
  totalLeads:       number;
  newLeads:         number;
  optedIn:          number;
  conversionRate:   number;
  appointments:     number;
  apptCompleted:    number;
  apptUpcoming:     number;
  apptCancelled:    number;
}


// ─── Reusable Stat Card ───────────────────────────────────────────────────────
const StatCard: React.FC<{
  label:    string;
  value:    string | number;
  sub?:     string;
  trend?:   'up' | 'down' | 'neutral';
  change?:  string;
  icon:     React.ElementType;
  loading?: boolean;
}> = ({ label, value, sub, trend, change, icon: Icon, loading }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {change && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          trend === 'up'   ? 'text-green-600 dark:text-green-400' :
          trend === 'down' ? 'text-red-500'   : 'text-muted-foreground'
        )}>
          {trend === 'up'   ? <TrendingUp  className="w-3.5 h-3.5" /> :
           trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
          {change}
        </div>
      )}
    </div>
    {loading ? (
      <div className="h-7 w-20 bg-muted/50 rounded animate-pulse mb-1" />
    ) : (
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    )}
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
  </div>
);

// ─── Chart skeleton ───────────────────────────────────────────────────────────
const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className={`h-[${height}px] flex items-end gap-1 px-2 pb-2`}
       style={{ height }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="flex-1 bg-muted/40 rounded-t animate-pulse"
        style={{ height: `${30 + Math.random() * 60}%` }}
      />
    ))}
  </div>
);


// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════
const Reports: React.FC = () => {
  const [range, setRange]  = useState<DateRange>('30d');

  const [summary,      setSummary]      = useState<Summary | null>(null);
  const [msgData,      setMsgData]      = useState<any[]>([]);
  const [funnelData,   setFunnelData]   = useState<any[]>([]);
  const [campData,     setCampData]     = useState<any[]>([]);
  const [sourceData,   setSourceData]   = useState<any[]>([]);
  const [apptData,     setApptData]     = useState<any[]>([]);

  const [loading, setLoading] = useState({
    summary: true, messages: true, funnel: true,
    campaigns: true, sources: true, appts: true,
  });

  // ─── Fetch all reports in parallel ─────────────────────────────────────────
  const fetchAll = useCallback(async (r: DateRange) => {
    setLoading({ summary: true, messages: true, funnel: true,
                 campaigns: true, sources: true, appts: true });
    const q = `?range=${r}`;
    try {
      const [s, m, f, c, src, a] = await Promise.allSettled([
        axios.get(`/api/reports/summary${q}`),
        axios.get(`/api/reports/messages${q}`),
        axios.get(`/api/reports/leads-funnel`),
        axios.get(`/api/reports/campaigns${q}`),
        axios.get(`/api/reports/lead-sources`),
        axios.get(`/api/reports/appointments${q}`),
      ]);

      if (s.status === 'fulfilled' && s.value.data.success) {
        setSummary(s.value.data.summary);
      }
      setLoading(p => ({ ...p, summary: false }));

      if (m.status === 'fulfilled' && m.value.data.success) {
        setMsgData(m.value.data.data);
      }
      setLoading(p => ({ ...p, messages: false }));

      if (f.status === 'fulfilled' && f.value.data.success) {
        setFunnelData(f.value.data.data);
      }
      setLoading(p => ({ ...p, funnel: false }));

      if (c.status === 'fulfilled' && c.value.data.success) {
        setCampData(c.value.data.data);
      }
      setLoading(p => ({ ...p, campaigns: false }));

      if (src.status === 'fulfilled' && src.value.data.success) {
        setSourceData(src.value.data.data);
      }
      setLoading(p => ({ ...p, sources: false }));

      if (a.status === 'fulfilled' && a.value.data.success) {
        setApptData(a.value.data.data);
      }
      setLoading(p => ({ ...p, appts: false }));

    } catch (err) {
      toast.error('Failed to load reports');
      setLoading({ summary: false, messages: false, funnel: false,
                   campaigns: false, sources: false, appts: false });
    }
  }, []);

  useEffect(() => { fetchAll(range); }, [range, fetchAll]);

  // ─── Export CSV ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!campData.length) return;
    const headers = ['Campaign', 'Sent', 'Delivered', 'Read', 'Replies', 'Failed'];
    const rows    = campData.map(c =>
      [c.fullName, c.sent, c.delivered, c.read, c.replies, c.failed].join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vaartabot_report_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  // ─── Animation ───────────────────────────────────────────────────────────
  const container = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border:          '1px solid hsl(var(--border))',
      borderRadius:    '8px',
      fontSize:        '12px',
    },
  };


  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="visible">

      {/* ── Header ── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live data from your message logs, leads, campaigns and appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAll(range)}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Cards — Row 1: Messages ── */}
      <motion.div variants={item}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Messages
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Messages Sent"     value={summary?.messagesSent.toLocaleString()     ?? '—'} icon={Send}         loading={loading.summary} />
          <StatCard label="Messages Received" value={summary?.messagesReceived.toLocaleString() ?? '—'} icon={MessageSquare} loading={loading.summary} />
          <StatCard label="Delivered Rate"    value={summary ? `${summary.deliveredRate}%`       : '—'} icon={CheckCircle}   loading={loading.summary} sub="of outbound" />
          <StatCard label="Read Rate"         value={summary ? `${summary.readRate}%`            : '—'} icon={MailOpen}      loading={loading.summary} sub="of outbound" />
        </div>
      </motion.div>

      {/* ── KPI Cards — Row 2: Leads & Appointments ── */}
      <motion.div variants={item}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Leads & Appointments
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Leads"       value={summary?.totalLeads   ?? '—'} icon={Users}      loading={loading.summary} />
          <StatCard label="Conversion Rate"   value={summary ? `${summary.conversionRate}%` : '—'} icon={Target} loading={loading.summary} sub="appointment + closed" />
          <StatCard label="Appointments"      value={summary?.appointments ?? '—'} icon={PhoneCall}  loading={loading.summary} sub={summary ? `${summary.apptCompleted} completed` : undefined} />
          <StatCard label="WhatsApp Opt-ins"  value={summary?.optedIn      ?? '—'} icon={CheckCircle} loading={loading.summary} />
        </div>
      </motion.div>

      {/* ── Row 1: Message Trends + Lead Funnel ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Message Trends */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Message Trends</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sent vs received per day</p>
          </div>
          <div className="h-[280px]">
            {loading.messages ? <ChartSkeleton height={280} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={msgData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tick={{ dy: 4 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="sent"     stroke={CHART_COLORS.primary}   strokeWidth={2} dot={false} name="Sent"     />
                  <Line type="monotone" dataKey="received" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} name="Received" />
                  <Line type="monotone" dataKey="read"     stroke={CHART_COLORS.success}   strokeWidth={1.5} dot={false} name="Read" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Lead Pipeline</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Leads at each stage</p>
          </div>
          <div className="h-[280px]">
            {loading.funnel ? <ChartSkeleton height={280} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={82} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Row 2: Campaign Performance + Lead Sources ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Campaign Performance */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Campaign Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sent / delivered / read — from message_logs per campaign
            </p>
          </div>
          <div className="h-[280px]">
            {loading.campaigns ? <ChartSkeleton height={280} /> : campData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No campaign data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={55} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sent"      fill={CHART_COLORS.primary}   radius={[3,3,0,0]} name="Sent"      />
                  <Bar dataKey="delivered" fill={CHART_COLORS.secondary} radius={[3,3,0,0]} name="Delivered" />
                  <Bar dataKey="read"      fill={CHART_COLORS.success}   radius={[3,3,0,0]} name="Read"      />
                  <Bar dataKey="replies"   fill={CHART_COLORS.warning}   radius={[3,3,0,0]} name="Replies"   />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Sources Pie */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Lead Sources</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Where leads come from</p>
          </div>
          <div className="h-[200px]">
            {loading.sources ? <ChartSkeleton height={200} /> : sourceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                       paddingAngle={2} dataKey="value">
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1.5 mt-3">
            {sourceData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Row 3: Appointments + Monthly Messages Area ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Appointments */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Appointments</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Scheduled / completed / cancelled by month</p>
          </div>
          <div className="h-[260px]">
            {loading.appts ? <ChartSkeleton height={260} /> : apptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No appointments in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apptData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="scheduled" fill={CHART_COLORS.secondary} radius={[3,3,0,0]} name="Scheduled" />
                  <Bar dataKey="completed" fill={CHART_COLORS.success}   radius={[3,3,0,0]} name="Completed" />
                  <Bar dataKey="cancelled" fill={CHART_COLORS.error}     radius={[3,3,0,0]} name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Summary row */}
          {summary && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              {[
                { label: 'Upcoming',  val: summary.apptUpcoming,  color: CHART_COLORS.secondary },
                { label: 'Completed', val: summary.apptCompleted, color: CHART_COLORS.success },
                { label: 'Cancelled', val: summary.apptCancelled, color: CHART_COLORS.error },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground ml-0.5">{s.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Volume Area Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Message Volume</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Total outbound activity over time</p>
          </div>
          <div className="h-[260px]">
            {loading.messages ? <ChartSkeleton height={260} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={msgData}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={CHART_COLORS.secondary} stopOpacity={0.20} />
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sent"     stroke={CHART_COLORS.primary}   strokeWidth={2} fill="url(#gradSent)"     name="Sent"     />
                  <Area type="monotone" dataKey="received" stroke={CHART_COLORS.secondary} strokeWidth={2} fill="url(#gradReceived)" name="Received" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
};

export default Reports;