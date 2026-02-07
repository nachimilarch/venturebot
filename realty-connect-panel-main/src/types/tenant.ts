export interface Tenant {
  id: string;
  name: string;
  logo: string;
  email: string;
  credits: number;
  totalMessagesSent: number;
  industry: string;
  phone: string;
  address: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  type: 'promotional' | 'follow-up' | 'newsletter' | 'announcement';
  messagesSent: number;
  messagesPending: number;
  opens: number;
  replies: number;
  createdAt: string;
  scheduledAt?: string;
  targetAudience: string;
  message: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'interested' | 'appointment' | 'closed' | 'lost';
  score: number;
  source: string;
  property: string;
  budget: string;
  lastContact: string;
  createdAt: string;
  notes: string;
  assignedTo: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  leadId: string;
  leadName: string;
  date: string;
  time: string;
  type: 'site-visit' | 'virtual-tour' | 'meeting' | 'follow-up';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  property: string;
  agent: string;
  notes: string;
}

export interface Transaction {
  id: string;
  tenantId: string;
  type: 'purchase' | 'usage' | 'refund';
  amount: number;
  credits: number;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  avatar: string;
  status: 'active' | 'inactive';
  phone: string;
  joinedAt: string;
}

export interface DashboardStats {
  credits: number;
  messagesSent: number;
  newLeads: number;
  upcomingAppointments: number;
  conversionRate: number;
  activeActiveCampaigns: number;
}

export interface ChartData {
  name: string;
  value: number;
  value2?: number;
}

export interface User {
  email: string;
  tenantId: string;
  name: string;
  role: 'admin' | 'manager' | 'agent';
}
