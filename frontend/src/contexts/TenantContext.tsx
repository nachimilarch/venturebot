// src/contexts/TenantContext.tsx
import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import {
  Tenant,
  Campaign,
  Lead,
  Appointment,
  Transaction,
  Staff,
  DashboardStats,
  ChartData
} from '@/types/tenant';

// Backend is on 3000 per your logs
axios.defaults.baseURL = 'http://localhost:3000';
axios.defaults.withCredentials = true;

interface TenantContextType {
  tenant: Tenant | null;
  campaigns: Campaign[];
  leads: Lead[];
  appointments: Appointment[];
  transactions: Transaction[];
  staff: Staff[];
  dashboardStats: DashboardStats | null;
  weeklyChartData: ChartData[];
  monthlyChartData: ChartData[];
  leadSourceData: ChartData[];
  loading: boolean;
  refreshCampaigns: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tenantId } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [weeklyChartData, setWeeklyChartData] = useState<ChartData[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<ChartData[]>([]);
  const [leadSourceData, setLeadSourceData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Define refreshCampaigns function
  const refreshCampaigns = async () => {
    try {
      console.log('[refreshCampaigns] Fetching campaigns...');
      const response = await axios.get('/api/campaigns');
      console.log('[refreshCampaigns] Response:', response.data);
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('[refreshCampaigns] Failed to refresh campaigns:', error);
      setCampaigns([]);
    }
  };

  useEffect(() => {
    console.log('[TenantContext] useEffect triggered with tenantId:', tenantId);
    
    if (!tenantId) {
      console.log('[TenantContext] No tenantId, clearing all data');
      setTenant(null);
      setCampaigns([]);
      setLeads([]);
      setAppointments([]);
      setTransactions([]);
      setStaff([]);
      setDashboardStats(null);
      setWeeklyChartData([]);
      setMonthlyChartData([]);
      setLeadSourceData([]);
      setLoading(false);
      return;
    }

    const loadTenantData = async () => {
      setLoading(true);
      console.log('[TenantContext] Starting to load tenant data...');
      
      try {
        // 1) Tenant profile
        try {
          const tenantRes = await axios.get('/api/tenant');
          if (tenantRes.data?.success) {
            setTenant(tenantRes.data.data);
          }
        } catch (error) {
          console.error('[TenantContext] Failed to load tenant:', error);
        }

        // 2) Dashboard stats
        try {
          const statsRes = await axios.get('/api/dashboard/stats');
          if (statsRes.data?.success) {
            const d = statsRes.data.data;
            setDashboardStats({
              credits: d.credits,
              messagesSent: d.messagesSent,
              newLeads: d.newLeads,
              upcomingAppointments: d.upcomingAppointments,
              conversionRate: d.conversionRate
            });
          }
        } catch (error) {
          console.error('[TenantContext] Failed to load stats:', error);
        }

        // 3) Dashboard charts
        try {
          const chartsRes = await axios.get('/api/dashboard/charts');
          if (chartsRes.data?.success) {
            const c = chartsRes.data.data;
            setWeeklyChartData(c.leadsTrend || []);
            setMonthlyChartData(c.monthlyPerformance || []);
            setLeadSourceData(c.leadsByStatus || []);
          }
        } catch (error) {
          console.error('[TenantContext] Failed to load charts:', error);
        }

        // 4) Leads
        try {
          const leadsRes = await axios.get('/api/leads');
          setLeads(leadsRes.data.data || leadsRes.data || []);
        } catch (error) {
          console.error('[TenantContext] Failed to load leads:', error);
          setLeads([]);
        }

        // 5) Appointments
        try {
          const apptRes = await axios.get('/api/appointments');
          setAppointments(apptRes.data.data || apptRes.data || []);
        } catch (error) {
          console.error('[TenantContext] Failed to load appointments:', error);
          setAppointments([]);
        }

        // 6) Staff
        try {
          const staffRes = await axios.get('/api/staff');
          setStaff(staffRes.data.data || staffRes.data || []);
        } catch (error) {
          console.error('[TenantContext] Failed to load staff:', error);
          setStaff([]);
        }

        // 7) Campaigns
        try {
          console.log('[TenantContext] Fetching campaigns from /api/campaigns...');
          const campRes = await axios.get('/api/campaigns');
          console.log('[TenantContext] Campaigns raw response:', campRes);
          console.log('[TenantContext] Campaigns data:', campRes.data);
          console.log('[TenantContext] Is array?', Array.isArray(campRes.data));
          
          if (Array.isArray(campRes.data)) {
            setCampaigns(campRes.data);
            console.log('[TenantContext] Campaigns set successfully, count:', campRes.data.length);
          } else {
            console.error('[TenantContext] Response is not an array!');
            setCampaigns([]);
          }
        } catch (error) {
          console.error('[TenantContext] Failed to load campaigns:', error);
          setCampaigns([]);
        }

        // 8) Transactions
        try {
          const txRes = await axios.get('/api/transactions');
          setTransactions(txRes.data.data || txRes.data || []);
        } catch (error) {
          console.error('[TenantContext] Failed to load transactions:', error);
          setTransactions([]);
        }
      } catch (err) {
        console.error('[TenantContext] Critical error loading tenant data', err);
      } finally {
        setLoading(false);
        console.log('[TenantContext] Finished loading tenant data');
      }
    };
    
    loadTenantData();
  }, [tenantId]);

  const value: TenantContextType = {
    tenant,
    campaigns,
    leads,
    appointments,
    transactions,
    staff,
    dashboardStats,
    weeklyChartData,
    monthlyChartData,
    leadSourceData,
    loading,
    refreshCampaigns
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
