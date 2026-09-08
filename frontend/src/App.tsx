import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import BulkMessaging from "./pages/BulkMessaging";
import Leads from "./pages/Leads";
import Appointments from "./pages/Appointments";
import Reports from "./pages/Reports";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Refund from "./pages/Refund";
import FlowConfig from './pages/FlowConfig';
import FlowBuilder from './pages/FlowBuilder';
import AboutUs from '@/pages/AboutUs';
import ApiDocs from '@/pages/ApiDocs';
import Contacts from '@/pages/Contacts';
import InboxPage from '@/pages/Inbox';
import Drip from '@/pages/Drip';
import Staff from '@/pages/Staff';

import SuperAdminLogin from '@/pages/superadmin/SuperAdminLogin';
import SuperAdminGuard from '@/pages/superadmin/SuperAdminGuard';
import SuperAdmin from '@/pages/superadmin/SuperAdmin';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/refund" element={<Refund />} />

              {/* ── Super Admin (completely separate from tenant app) ── */}
              <Route path="/superadmin/login" element={<SuperAdminLogin />} />
              <Route element={<SuperAdminGuard />}>
                <Route path="/superadmin/dashboard" element={<SuperAdmin />} />
              </Route>

              {/* Redirect /superadmin → /superadmin/login */}
              <Route path="/superadmin" element={<Navigate to="/superadmin/login" replace />} />

              {/* Protected */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/messaging" element={<BulkMessaging />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/flow-config" element={<FlowConfig />} />
                <Route path="/flow-builder" element={<FlowBuilder />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/drip" element={<Drip />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;