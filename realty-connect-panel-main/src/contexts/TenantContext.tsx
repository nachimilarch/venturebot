import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { tenants, tenantData, getDashboardStats, getWeeklyChartData, getMonthlyChartData, getLeadSourceData } from '@/data/tenants';
import { Tenant, Campaign, Lead, Appointment, Transaction, Staff, DashboardStats, ChartData } from '@/types/tenant';

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
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tenantId } = useAuth();

  const tenant = tenantId ? tenants[tenantId] : null;
  const data = tenantId ? tenantData[tenantId] : null;

  const value: TenantContextType = {
    tenant,
    campaigns: data?.campaigns || [],
    leads: data?.leads || [],
    appointments: data?.appointments || [],
    transactions: data?.transactions || [],
    staff: data?.staff || [],
    dashboardStats: tenantId ? getDashboardStats(tenantId) : null,
    weeklyChartData: tenantId ? getWeeklyChartData(tenantId) : [],
    monthlyChartData: tenantId ? getMonthlyChartData(tenantId) : [],
    leadSourceData: tenantId ? getLeadSourceData(tenantId) : []
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
