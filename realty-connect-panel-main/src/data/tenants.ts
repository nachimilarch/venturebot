import { Tenant, Campaign, Lead, Appointment, Transaction, Staff, DashboardStats, ChartData } from '@/types/tenant';

export const tenants: Record<string, Tenant> = {
  company1: {
    id: 'company1',
    name: 'Sunrise Realtors',
    logo: '🌅',
    email: 'company1@gmail.com',
    credits: 15420,
    totalMessagesSent: 48230,
    industry: 'Residential Real Estate',
    phone: '+1 (555) 100-1001',
    address: '123 Sunrise Ave, Miami, FL 33101'
  },
  company2: {
    id: 'company2',
    name: 'GreenField Estates',
    logo: '🌿',
    email: 'company2@gmail.com',
    credits: 8750,
    totalMessagesSent: 32100,
    industry: 'Agricultural Land',
    phone: '+1 (555) 200-2002',
    address: '456 Green Valley Rd, Austin, TX 78701'
  },
  company3: {
    id: 'company3',
    name: 'Royal Lands',
    logo: '👑',
    email: 'company3@gmail.com',
    credits: 22300,
    totalMessagesSent: 67890,
    industry: 'Luxury Properties',
    phone: '+1 (555) 300-3003',
    address: '789 Royal Plaza, Beverly Hills, CA 90210'
  },
  company4: {
    id: 'company4',
    name: 'UrbanPlots Pvt Ltd',
    logo: '🏙️',
    email: 'company4@gmail.com',
    credits: 12100,
    totalMessagesSent: 41500,
    industry: 'Commercial Real Estate',
    phone: '+1 (555) 400-4004',
    address: '321 Urban Center, New York, NY 10001'
  },
  company5: {
    id: 'company5',
    name: 'Metro Properties',
    logo: '🚇',
    email: 'company5@gmail.com',
    credits: 9800,
    totalMessagesSent: 28900,
    industry: 'Transit-Oriented Development',
    phone: '+1 (555) 500-5005',
    address: '654 Metro Station Dr, Chicago, IL 60601'
  },
  company6: {
    id: 'company6',
    name: 'DreamSpace Builders',
    logo: '✨',
    email: 'company6@gmail.com',
    credits: 18500,
    totalMessagesSent: 55200,
    industry: 'New Construction',
    phone: '+1 (555) 600-6006',
    address: '987 Dream Lane, Seattle, WA 98101'
  },
  company7: {
    id: 'company7',
    name: 'Golden Acres',
    logo: '🌾',
    email: 'company7@gmail.com',
    credits: 7200,
    totalMessagesSent: 19800,
    industry: 'Ranch Properties',
    phone: '+1 (555) 700-7007',
    address: '147 Golden Ranch Rd, Denver, CO 80201'
  },
  company8: {
    id: 'company8',
    name: 'Prime City Developers',
    logo: '🏗️',
    email: 'company8@gmail.com',
    credits: 25600,
    totalMessagesSent: 78400,
    industry: 'Mixed-Use Development',
    phone: '+1 (555) 800-8008',
    address: '258 Prime Tower, San Francisco, CA 94101'
  },
  company9: {
    id: 'company9',
    name: 'SkyView Ventures',
    logo: '🌆',
    email: 'company9@gmail.com',
    credits: 14300,
    totalMessagesSent: 43600,
    industry: 'High-Rise Apartments',
    phone: '+1 (555) 900-9009',
    address: '369 Sky Plaza, Phoenix, AZ 85001'
  },
  company10: {
    id: 'company10',
    name: 'Heritage Plots',
    logo: '🏛️',
    email: 'company10@gmail.com',
    credits: 11200,
    totalMessagesSent: 36700,
    industry: 'Historic Properties',
    phone: '+1 (555) 100-1010',
    address: '741 Heritage Square, Boston, MA 02101'
  }
};

// Generate tenant-specific campaigns
const generateCampaigns = (tenantId: string, baseIndex: number): Campaign[] => {
  const campaignTypes: Campaign['type'][] = ['promotional', 'follow-up', 'newsletter', 'announcement'];
  const statuses: Campaign['status'][] = ['active', 'paused', 'completed', 'draft'];
  const audiences = ['First-time buyers', 'Investors', 'Luxury seekers', 'Families', 'Young professionals'];
  
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${tenantId}-camp-${i + 1}`,
    tenantId,
    name: `Campaign ${baseIndex + i + 1} - ${['New Launch', 'Weekend Offer', 'Price Drop', 'Exclusive Preview', 'Open House', 'Flash Sale', 'VIP Tour', 'Limited Time'][i]}`,
    status: statuses[i % 4],
    type: campaignTypes[i % 4],
    messagesSent: Math.floor(Math.random() * 5000) + 500,
    messagesPending: Math.floor(Math.random() * 1000),
    opens: Math.floor(Math.random() * 3000) + 200,
    replies: Math.floor(Math.random() * 500) + 50,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledAt: i % 2 === 0 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    targetAudience: audiences[i % 5],
    message: `Hi {{name}}, exciting news about our latest properties! Check out our ${['amazing deals', 'exclusive offers', 'new listings', 'premium properties'][i % 4]}.`
  }));
};

// Generate tenant-specific leads
const generateLeads = (tenantId: string, staffNames: string[]): Lead[] => {
  const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Jennifer', 'William', 'Amanda', 'Daniel', 'Ashley', 'Christopher', 'Stephanie', 'Matthew'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas'];
  const statuses: Lead['status'][] = ['new', 'interested', 'appointment', 'closed', 'lost'];
  const sources = ['WhatsApp', 'Website', 'Referral', 'Facebook', 'Instagram', 'Google Ads', 'Walk-in'];
  const properties = ['Ocean View Villa', 'Downtown Apartment', 'Suburban House', 'Luxury Penthouse', 'Garden Estate', 'Modern Condo', 'Heritage Bungalow'];
  const budgets = ['$200K-$300K', '$300K-$500K', '$500K-$750K', '$750K-$1M', '$1M-$2M', '$2M+'];

  return Array.from({ length: 25 }, (_, i) => ({
    id: `${tenantId}-lead-${i + 1}`,
    tenantId,
    name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@email.com`,
    phone: `+1 (555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i * 11).slice(0, 4)}`,
    status: statuses[i % 5],
    score: Math.floor(Math.random() * 50) + 50,
    source: sources[i % sources.length],
    property: properties[i % properties.length],
    budget: budgets[i % budgets.length],
    lastContact: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Interested in property features and pricing details.',
    assignedTo: staffNames[i % staffNames.length]
  }));
};

// Generate tenant-specific appointments
const generateAppointments = (tenantId: string, leads: Lead[], staffNames: string[]): Appointment[] => {
  const types: Appointment['type'][] = ['site-visit', 'virtual-tour', 'meeting', 'follow-up'];
  const statuses: Appointment['status'][] = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
  const properties = ['Ocean View Villa', 'Downtown Apartment', 'Suburban House', 'Luxury Penthouse', 'Garden Estate'];
  
  return Array.from({ length: 15 }, (_, i) => {
    const lead = leads[i % leads.length];
    const date = new Date(Date.now() + (i - 5) * 24 * 60 * 60 * 1000);
    return {
      id: `${tenantId}-apt-${i + 1}`,
      tenantId,
      leadId: lead.id,
      leadName: lead.name,
      date: date.toISOString().split('T')[0],
      time: `${9 + (i % 8)}:${i % 2 === 0 ? '00' : '30'}`,
      type: types[i % 4],
      status: statuses[i % 4],
      property: properties[i % properties.length],
      agent: staffNames[i % staffNames.length],
      notes: 'Client requested detailed property walkthrough.'
    };
  });
};

// Generate tenant-specific transactions
const generateTransactions = (tenantId: string): Transaction[] => {
  const types: Transaction['type'][] = ['purchase', 'usage', 'refund'];
  const descriptions = [
    'Credit package purchase - 5000 credits',
    'Campaign message usage',
    'Bulk messaging deduction',
    'Promotional credits added',
    'Monthly subscription',
    'Refund for failed messages'
  ];

  return Array.from({ length: 20 }, (_, i) => ({
    id: `${tenantId}-txn-${i + 1}`,
    tenantId,
    type: types[i % 3],
    amount: types[i % 3] === 'purchase' ? Math.floor(Math.random() * 500) + 100 : -(Math.floor(Math.random() * 50) + 10),
    credits: types[i % 3] === 'purchase' ? Math.floor(Math.random() * 5000) + 1000 : -(Math.floor(Math.random() * 500) + 100),
    date: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: descriptions[i % descriptions.length],
    status: i % 10 === 0 ? 'pending' : 'completed'
  }));
};

// Generate tenant-specific staff
const generateStaff = (tenantId: string): Staff[] => {
  const names = ['Alex Thompson', 'Maria Garcia', 'John Chen', 'Lisa Park', 'Mike Johnson'];
  const roles: Staff['role'][] = ['admin', 'manager', 'agent', 'agent', 'agent'];
  
  return names.map((name, i) => ({
    id: `${tenantId}-staff-${i + 1}`,
    tenantId,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@${tenantId}.com`,
    role: roles[i],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    status: i === 4 ? 'inactive' : 'active',
    phone: `+1 (555) ${String(200 + i).padStart(3, '0')}-${String(2000 + i * 11).slice(0, 4)}`,
    joinedAt: new Date(Date.now() - (365 - i * 60) * 24 * 60 * 60 * 1000).toISOString()
  }));
};

// Generate dashboard stats for a tenant
export const getDashboardStats = (tenantId: string): DashboardStats => {
  const tenant = tenants[tenantId];
  const leads = tenantData[tenantId]?.leads || [];
  const appointments = tenantData[tenantId]?.appointments || [];
  const campaigns = tenantData[tenantId]?.campaigns || [];
  
  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'scheduled' && new Date(apt.date) >= new Date()
  ).length;
  
  const closedLeads = leads.filter(l => l.status === 'closed').length;
  const conversionRate = leads.length > 0 ? Math.round((closedLeads / leads.length) * 100) : 0;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  
  return {
    credits: tenant?.credits || 0,
    messagesSent: tenant?.totalMessagesSent || 0,
    newLeads: leads.filter(l => l.status === 'new').length,
    upcomingAppointments,
    conversionRate,
    activeActiveCampaigns: activeCampaigns
  };
};

// Generate weekly chart data for a tenant
export const getWeeklyChartData = (tenantId: string): ChartData[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const multiplier = Object.keys(tenants).indexOf(tenantId) + 1;
  
  return days.map((day, i) => ({
    name: day,
    value: Math.floor(Math.random() * 500 * multiplier) + 100 * multiplier,
    value2: Math.floor(Math.random() * 300 * multiplier) + 50 * multiplier
  }));
};

// Generate monthly chart data for a tenant
export const getMonthlyChartData = (tenantId: string): ChartData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const multiplier = Object.keys(tenants).indexOf(tenantId) + 1;
  
  return months.map((month, i) => ({
    name: month,
    value: Math.floor(Math.random() * 10000 * multiplier) + 2000 * multiplier,
    value2: Math.floor(Math.random() * 200 * multiplier) + 50 * multiplier
  }));
};

// Generate lead source distribution
export const getLeadSourceData = (tenantId: string): ChartData[] => {
  const sources = ['WhatsApp', 'Website', 'Referral', 'Social Media', 'Other'];
  const multiplier = Object.keys(tenants).indexOf(tenantId) + 1;
  
  return sources.map(source => ({
    name: source,
    value: Math.floor(Math.random() * 30 * multiplier) + 10
  }));
};

// Build complete tenant data
export const tenantData: Record<string, {
  campaigns: Campaign[];
  leads: Lead[];
  appointments: Appointment[];
  transactions: Transaction[];
  staff: Staff[];
}> = {};

// Initialize data for all tenants
Object.keys(tenants).forEach((tenantId, index) => {
  const staff = generateStaff(tenantId);
  const staffNames = staff.map(s => s.name);
  const leads = generateLeads(tenantId, staffNames);
  
  tenantData[tenantId] = {
    campaigns: generateCampaigns(tenantId, index * 10),
    leads,
    appointments: generateAppointments(tenantId, leads, staffNames),
    transactions: generateTransactions(tenantId),
    staff
  };
});

// User credentials for login simulation
export const userCredentials: Record<string, { password: string; tenantId: string; name: string; role: 'admin' | 'manager' | 'agent' }> = {
  'company1@gmail.com': { password: 'password123', tenantId: 'company1', name: 'Admin User', role: 'admin' },
  'company2@gmail.com': { password: 'password123', tenantId: 'company2', name: 'Admin User', role: 'admin' },
  'company3@gmail.com': { password: 'password123', tenantId: 'company3', name: 'Admin User', role: 'admin' },
  'company4@gmail.com': { password: 'password123', tenantId: 'company4', name: 'Admin User', role: 'admin' },
  'company5@gmail.com': { password: 'password123', tenantId: 'company5', name: 'Admin User', role: 'admin' },
  'company6@gmail.com': { password: 'password123', tenantId: 'company6', name: 'Admin User', role: 'admin' },
  'company7@gmail.com': { password: 'password123', tenantId: 'company7', name: 'Admin User', role: 'admin' },
  'company8@gmail.com': { password: 'password123', tenantId: 'company8', name: 'Admin User', role: 'admin' },
  'company9@gmail.com': { password: 'password123', tenantId: 'company9', name: 'Admin User', role: 'admin' },
  'company10@gmail.com': { password: 'password123', tenantId: 'company10', name: 'Admin User', role: 'admin' }
};
