import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Target,
  Percent
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(173, 58%, 39%)', 'hsl(160, 60%, 45%)', 'hsl(197, 71%, 52%)', 'hsl(215, 80%, 50%)', 'hsl(262, 83%, 58%)'];

const Reports: React.FC = () => {
  const { weeklyChartData, monthlyChartData, leadSourceData, campaigns, leads, dashboardStats } = useTenant();
  const [dateRange, setDateRange] = useState('30d');

  const campaignPerformance = campaigns.slice(0, 5).map(c => ({
    name: c.name.substring(0, 15) + '...',
    sent: c.messagesSent,
    opened: c.opens,
    replied: c.replies
  }));

  const conversionData = [
    { stage: 'New', count: leads.filter(l => l.status === 'new').length },
    { stage: 'Interested', count: leads.filter(l => l.status === 'interested').length },
    { stage: 'Appointment', count: leads.filter(l => l.status === 'appointment').length },
    { stage: 'Closed', count: leads.filter(l => l.status === 'closed').length }
  ];

  const stats = [
    { 
      label: 'Total Messages', 
      value: dashboardStats?.messagesSent?.toLocaleString() || '0',
      change: '+12.5%',
      trend: 'up',
      icon: MessageSquare
    },
    { 
      label: 'Total Leads', 
      value: leads.length.toString(),
      change: '+8.3%',
      trend: 'up',
      icon: Users
    },
    { 
      label: 'Conversion Rate', 
      value: `${dashboardStats?.conversionRate || 0}%`,
      change: '+2.1%',
      trend: 'up',
      icon: Target
    },
    { 
      label: 'Open Rate', 
      value: '68.4%',
      change: '-1.2%',
      trend: 'down',
      icon: Percent
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your campaign performance and lead conversions
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-tenant-accent-light flex items-center justify-center">
                <stat.icon className="w-5 h-5 tenant-accent-text" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                stat.trend === 'up' ? 'text-success' : 'text-destructive'
              )}>
                {stat.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Trends */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Message Trends</h3>
            <p className="text-sm text-muted-foreground">Messages sent vs opened over time</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(173, 58%, 39%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(173, 58%, 39%)' }}
                  name="Sent"
                />
                <Line 
                  type="monotone" 
                  dataKey="value2" 
                  stroke="hsl(197, 71%, 52%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(197, 71%, 52%)' }}
                  name="Opened"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Lead Conversion Funnel</h3>
            <p className="text-sm text-muted-foreground">Leads at each pipeline stage</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--tenant-accent))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Performance */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Campaign Performance</h3>
            <p className="text-sm text-muted-foreground">Top campaigns by engagement</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="sent" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="opened" fill="hsl(197, 71%, 52%)" radius={[4, 4, 0, 0]} name="Opened" />
                <Bar dataKey="replied" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} name="Replied" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Lead Sources</h3>
            <p className="text-sm text-muted-foreground">Where leads come from</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {leadSourceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {leadSourceData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                <span className="text-xs font-medium text-foreground ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Monthly Overview */}
      <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Monthly Overview</h3>
            <p className="text-sm text-muted-foreground">Performance across months</p>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyChartData}>
              <defs>
                <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(173, 58%, 39%)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorMonthly)"
                name="Messages"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Reports;
