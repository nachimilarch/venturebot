import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  MessageSquare, 
  Users, 
  Calendar,
  TrendingUp,
  Megaphone,
  ArrowRight,
  ArrowUpRight,
  X,
  Check,
  Info,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useTenant } from '@/contexts/TenantContext';
import StatCard from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

const COLORS = ['hsl(173, 58%, 39%)', 'hsl(160, 60%, 45%)', 'hsl(197, 71%, 52%)', 'hsl(215, 80%, 50%)', 'hsl(262, 83%, 58%)'];

// Add New Lead Modal Component
const AddNewLeadModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    email: '',
    phone: '',
    property: '',
    budget: '',
    assignedTo: '',
    status: 'New'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating lead:', formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl shadow-2xl z-50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add New Lead</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Name"
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="text"
            name="source"
            value={formData.source}
            onChange={handleChange}
            placeholder="Source"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="text"
            name="property"
            value={formData.property}
            onChange={handleChange}
            placeholder="Property"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="text"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            placeholder="Budget"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="text"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            placeholder="Assigned To"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
          />
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tenant-accent focus:border-transparent transition-all text-foreground"
          >
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
          </select>
          <div className="flex items-center gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
              Save Lead
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
};

const Dashboard: React.FC = () => {
  const { 
    tenant, 
    dashboardStats, 
    weeklyChartData, 
    monthlyChartData, 
    leadSourceData,
    leads,
    appointments,
    campaigns
  } = useTenant();

  const navigate = useNavigate();
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'scheduled' && new Date(apt.date) >= new Date())
    .slice(0, 5);

  const recentLeads = leads
    .filter(lead => lead.status === 'new')
    .slice(0, 5);

  const activeCampaigns = campaigns.filter(c => c.status === 'active').slice(0, 3);

  const handleNewCampaign = () => {
    navigate('/campaigns', { state: { openNewCampaign: true } });
  };

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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {tenant?.name} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your campaigns today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit"
            onClick={handleNewCampaign}
          >
            <Megaphone className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Credits Balance" value={dashboardStats?.credits?.toLocaleString() || '0'} change="+12%" changeType="positive" icon={CreditCard} description="from last month" />
        <StatCard title="Messages Sent" value={dashboardStats?.messagesSent?.toLocaleString() || '0'} change="+8.2%" changeType="positive" icon={MessageSquare} description="this month" />
        <StatCard title="New Leads" value={dashboardStats?.newLeads || 0} change="+15%" changeType="positive" icon={Users} description="this week" />
        <StatCard title="Appointments" value={dashboardStats?.upcomingAppointments || 0} icon={Calendar} description="upcoming" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Messages Overview</h3>
              <p className="text-sm text-muted-foreground">Weekly message performance</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-1" />
                <span className="text-muted-foreground">Sent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-3" />
                <span className="text-muted-foreground">Opened</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(197, 71%, 52%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(197, 71%, 52%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="hsl(173, 58%, 39%)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                <Area type="monotone" dataKey="value2" stroke="hsl(197, 71%, 52%)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Lead Sources</h3>
            <p className="text-sm text-muted-foreground">Where your leads come from</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {leadSourceData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {leadSourceData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Leads</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-tenant-accent hover:text-tenant-accent hover:bg-tenant-accent/10"
                onClick={() => setShowAddLeadModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Link to="/leads">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {recentLeads.map((lead, index) => (
              <motion.div 
                key={lead.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-tenant-accent-light flex items-center justify-center font-medium tenant-accent-text">
                  {lead.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.property}</p>
                </div>
                <span className="status-badge status-info text-xs">New</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Upcoming Appointments</h3>
            <Link to="/appointments">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.map((apt, index) => (
              <motion.div 
                key={apt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex flex-col items-center justify-center text-xs">
                  <span className="font-bold text-foreground">{new Date(apt.date).getDate()}</span>
                  <span className="text-muted-foreground text-[10px]">{new Date(apt.date).toLocaleDateString('en', { month: 'short' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">{apt.leadName}</p>
                  <p className="text-xs text-muted-foreground">{apt.time} • {apt.type}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Active Campaigns</h3>
            <Link to="/campaigns">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {activeCampaigns.map((campaign, index) => (
              <motion.div 
                key={campaign.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border border-border hover:border-tenant-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-foreground text-sm">{campaign.name}</p>
                  <span className="status-badge status-success text-xs">Active</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {campaign.messagesSent.toLocaleString()} sent
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {Math.round((campaign.opens / campaign.messagesSent) * 100)}% open
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Monthly Performance</h3>
            <p className="text-sm text-muted-foreground">Messages sent and lead conversions</p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-success">+{dashboardStats?.conversionRate}% conversion</span>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="hsl(var(--tenant-accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="value2" fill="hsl(197, 71%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddLeadModal && <AddNewLeadModal onClose={() => setShowAddLeadModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;