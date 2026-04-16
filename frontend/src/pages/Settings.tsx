import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Key,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  Info,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';


// ─── Types ────────────────────────────────────────────────────────────────────


interface WhatsAppConfig {
  id?: number;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  app_id: string;
  app_secret: string;
  verify_token: string;
  webhook_secret: string;
  display_phone_number: string;
  verified_name: string;
  api_version: string;
  is_active: boolean;
  is_verified: boolean;
  quality_rating: string;
  account_mode:   string;
}


const EMPTY_CONFIG: WhatsAppConfig = {
  phone_number_id:      '',
  business_account_id:  '',
  access_token:         '',
  app_id:               '',
  app_secret:           '',
  verify_token:         '',
  webhook_secret:       '',
  display_phone_number: '',
  verified_name:        '',
  quality_rating:       'GREEN',  // ✅ DB default
  account_mode:         'LIVE',   // ✅ DB default
  api_version:          'v21.0',  // ✅ DB default
  is_active:            true,     // ✅ DB default 1
  is_verified:          false,    // ✅ DB default 0
};


// ─── Helper: masked token display ─────────────────────────────────────────────
const maskToken = (val: string) =>
  val.length > 10 ? val.slice(0, 6) + '••••••••••••' + val.slice(-4) : '••••••••••••';


// ─── Tooltip Helper ───────────────────────────────────────────────────────────
const FieldHint: React.FC<{ text: string }> = ({ text }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help inline ml-1 -mt-0.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);


// ─── Main Component ───────────────────────────────────────────────────────────


const Settings: React.FC = () => {
  const { tenant, staff } = useTenant();
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: '' });
  const [isAddingStaff, setIsAddingStaff] = useState(false);


  // Company
  const [companySettings, setCompanySettings] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    industry: '',
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);


  // Notifications
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    campaignAlerts: true,
    leadAlerts: true,
    appointmentReminders: true,
    billingAlerts: true,
  });


  // WhatsApp Config state
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(EMPTY_CONFIG);
  const [waExists, setWaExists] = useState(false);
  const [isLoadingWa, setIsLoadingWa] = useState(true);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);


  // Visibility toggles
  const [showToken, setShowToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);


  // Webhook URL (read-only, shown to user for Meta setup)
  const [webhookUrl, setWebhookUrl] = useState('');


  // ── Animation variants ────────────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };


  // ── Sync tenant into company form ─────────────────────────────────────────
  useEffect(() => {
    if (tenant) {
      setCompanySettings({
        name:     tenant.name                   || '',
        email:    (tenant as any).email         || '',
        phone:    (tenant as any).phone         || '',
        address:  (tenant as any).address       || '',
        industry: tenant.industry               || '',
      });
    }
  }, [tenant]);


  // ── Load WhatsApp config + build webhook URL on mount ────────────────────
  useEffect(() => {
    fetchWaConfig();
    const base =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : `${window.location.protocol}//${window.location.hostname}:3000`;
    setWebhookUrl(`${base}/webhook`);
  }, []);


  // ── Fetch & populate WhatsApp config ─────────────────────────────────────
  const fetchWaConfig = async () => {
  setIsLoadingWa(true);
  try {
    const res = await axios.get('/api/whatsapp/config');

    // ✅ API returns res.data.config, NOT res.data.data
    if (res.data.success && res.data.config) {
      const raw = res.data.config;

      const normalised: WhatsAppConfig = {
        ...EMPTY_CONFIG,
        ...raw,
        is_active:            raw.is_active   === true || raw.is_active   === 1,
        is_verified:          raw.is_verified === true || raw.is_verified === 1,
        phone_number_id:      raw.phone_number_id      ?? '',
        business_account_id:  raw.business_account_id  ?? '',
        access_token:         raw.access_token         ?? '',
        app_id:               raw.app_id               ?? '',
        app_secret:           raw.app_secret           ?? '',
        verify_token:         raw.verify_token         ?? '',
        webhook_secret:       raw.webhook_secret       ?? '',
        display_phone_number: raw.display_phone_number ?? '',
        verified_name:        raw.verified_name        ?? '',
        quality_rating:       raw.quality_rating       ?? 'GREEN',
        account_mode:         raw.account_mode         ?? 'LIVE',
        api_version:          raw.api_version          ?? 'v21.0',
      };

      setWaConfig(normalised);
      setWaExists(true);
    } else {
      setWaConfig(EMPTY_CONFIG);
      setWaExists(false);
    }
  } catch {
    setWaConfig(EMPTY_CONFIG);
    setWaExists(false);
  } finally {
    setIsLoadingWa(false);
  }
};


  // ── Company save ──────────────────────────────────────────────────────────
  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try {
      await axios.put('/api/tenant', companySettings);
      toast.success('Company profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save company settings');
    } finally {
      setIsSavingCompany(false);
    }
  };


  // ── WhatsApp: verify credentials against Meta Graph API ──────────────────
  const handleVerify = async () => {
    if (!waConfig.phone_number_id || !waConfig.access_token) {
      toast.error('Enter Phone Number ID and Access Token before verifying');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await axios.post('/api/whatsapp/verify-config', {
        phone_number_id: waConfig.phone_number_id,
        access_token:    waConfig.access_token,
        api_version:     waConfig.api_version,
      });
      if (res.data.success) {
        setWaConfig(prev => ({
          ...prev,
          display_phone_number: res.data.phone_number   || prev.display_phone_number,
          verified_name:        res.data.verified_name  || prev.verified_name,
          quality_rating:       res.data.quality_rating || prev.quality_rating,
          is_verified: true,
        }));
        toast.success(
          `✅ Verified! ${res.data.verified_name} — ${res.data.phone_number}`
        );
      } else {
        toast.error(res.data.error || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          'Could not reach Meta. Check your Phone Number ID and Access Token.'
      );
    } finally {
      setIsVerifying(false);
    }
  };


  // ── WhatsApp: save config to DB ───────────────────────────────────────────
  const handleSaveWa = async () => {
    const required: Array<{ key: keyof WhatsAppConfig; label: string }> = [
      { key: 'phone_number_id',       label: 'Phone Number ID' },
      { key: 'business_account_id',   label: 'WhatsApp Business Account ID' },
      { key: 'access_token',          label: 'Permanent Access Token' },
      { key: 'verify_token',          label: 'Webhook Verify Token' },
    ];
    for (const { key, label } of required) {
      if (!waConfig[key]) {
        toast.error(`${label} is required`);
        return;
      }
    }

    setIsSavingWa(true);
    try {
      const payload = {
        phone_number_id:      waConfig.phone_number_id,
        business_account_id:  waConfig.business_account_id,
        access_token:         waConfig.access_token,
        app_id:               waConfig.app_id               || null,
        app_secret:           waConfig.app_secret           || null,
        verify_token:         waConfig.verify_token,
        webhook_secret:       waConfig.webhook_secret       || null,
        display_phone_number: waConfig.display_phone_number || null,
        verified_name:        waConfig.verified_name        || null,
        quality_rating:       waConfig.quality_rating       || 'GREEN',
        account_mode:         waConfig.account_mode         || 'LIVE',
        api_version:          waConfig.api_version          || 'v21.0',
        is_active:            waConfig.is_active   ? 1 : 0,
        is_verified:          waConfig.is_verified ? 1 : 0,
      };

      if (waExists) {
        await axios.put('/api/whatsapp/config', payload);
      } else {
        await axios.post('/api/whatsapp/config', payload);
        setWaExists(true);
      }
      toast.success('WhatsApp configuration saved!');
      await fetchWaConfig();          // re-fetch to confirm DB round-trip
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save WhatsApp config');
    } finally {
      setIsSavingWa(false);
    }
  };


  // ── Auto-generate verify token ────────────────────────────────────────────
  const generateVerifyToken = () => {
    const token =
      'vb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    setWaConfig(prev => ({ ...prev, verify_token: token }));
    toast.success('Verify token generated');
  };


  // ── Copy helper ───────────────────────────────────────────────────────────
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };


  // ── Add staff ─────────────────────────────────────────────────────────────
  const handleAddStaff = async () => {
    if (!staffForm.name || !staffForm.email || !staffForm.role) {
      toast.error('All fields are required');
      return;
    }
    setIsAddingStaff(true);
    try {
      await axios.post('/api/staff', staffForm);
      toast.success('Team member added');
      setIsAddStaffOpen(false);
      setStaffForm({ name: '', email: '', role: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setIsAddingStaff(false);
    }
  };


  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────


  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your company profile and WhatsApp API configuration
        </p>
      </motion.div>


      <Tabs defaultValue="api">
        <motion.div variants={itemVariants}>
          <TabsList className="bg-muted">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp API</span>
              {/* Badge when not configured */}
              {!isLoadingWa && !waExists && (
                <span className="ml-1 w-2 h-2 rounded-full bg-destructive inline-block" />
              )}
            </TabsTrigger>
          </TabsList>
        </motion.div>


        {/* ───────────────────────── Company ───────────────────────────── */}
        <TabsContent value="company" className="mt-6">
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-6">Company Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={companySettings.name}
                  onChange={e =>
                    setCompanySettings({ ...companySettings, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={companySettings.email}
                  onChange={e =>
                    setCompanySettings({ ...companySettings, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={companySettings.phone}
                  onChange={e =>
                    setCompanySettings({ ...companySettings, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={companySettings.industry}
                  onChange={e =>
                    setCompanySettings({ ...companySettings, industry: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={companySettings.address}
                  onChange={e =>
                    setCompanySettings({ ...companySettings, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSaveCompany}
                disabled={isSavingCompany}
                className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
              >
                {isSavingCompany ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </motion.div>
        </TabsContent>


        {/* ───────────────────────── Team ──────────────────────────────── */}
        <TabsContent value="team" className="mt-6">
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your sales team and agents
                </p>
              </div>
              <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={staffForm.name}
                        onChange={e =>
                          setStaffForm({ ...staffForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        value={staffForm.email}
                        onChange={e =>
                          setStaffForm({ ...staffForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={staffForm.role}
                        onValueChange={val =>
                          setStaffForm({ ...staffForm, role: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddStaffOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddStaff}
                        disabled={isAddingStaff}
                        className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                      >
                        {isAddingStaff ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Add Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(member => (
                    <tr key={member.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                                            <td>
                        <span className="capitalize text-foreground">{member.role}</span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'status-badge',
                            member.status === 'active' ? 'status-success' : 'status-error'
                          )}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No team members yet. Add your first member above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>


        {/* ───────────────────────── Notifications ─────────────────────── */}
        <TabsContent value="notifications" className="mt-6">
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Notification Preferences
            </h2>
            <div className="space-y-1">
              {[
                {
                  key: 'emailNotifications',
                  label: 'Email Notifications',
                  desc: 'Receive updates via email',
                },
                {
                  key: 'smsNotifications',
                  label: 'SMS Notifications',
                  desc: 'Receive updates via SMS',
                },
                {
                  key: 'campaignAlerts',
                  label: 'Campaign Alerts',
                  desc: 'Get notified about campaign performance',
                },
                {
                  key: 'leadAlerts',
                  label: 'New Lead Alerts',
                  desc: 'Get notified when new leads come in',
                },
                {
                  key: 'appointmentReminders',
                  label: 'Appointment Reminders',
                  desc: 'Reminders before scheduled appointments',
                },
                {
                  key: 'billingAlerts',
                  label: 'Billing Alerts',
                  desc: 'Notifications about credits and billing',
                },
              ].map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={checked =>
                      setNotifications({ ...notifications, [item.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>


        {/* ───────────────────────── WhatsApp API ──────────────────────── */}
        <TabsContent value="api" className="mt-6 space-y-5">

          {/* ── Status banner ── */}
          <motion.div variants={itemVariants}>
            {isLoadingWa ? (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Loading WhatsApp configuration…
                </span>
              </div>
            ) : waExists && waConfig.is_verified ? (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      WhatsApp Connected
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {waConfig.verified_name} · {waConfig.display_phone_number}
                      {waConfig.quality_rating && (
                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full">
                          Quality: {waConfig.quality_rating}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchWaConfig}
                  className="text-green-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            ) : waExists && !waConfig.is_verified ? (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <XCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    Credentials saved but not verified
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Click <strong>Verify Connection</strong> below to test your credentials
                    against Meta.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <Zap className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    WhatsApp not configured
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Fill in your Meta / WhatsApp Cloud API credentials below to start sending
                    messages.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Webhook URL (read-only) ── */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-6 space-y-3"
          >
            <div>
              <h3 className="font-semibold text-foreground">Webhook URL</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste this URL in your Meta App → WhatsApp → Configuration → Webhook URL
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="flex-1 font-mono text-sm bg-muted"
              />
              <Button variant="outline" onClick={() => copy(webhookUrl, 'Webhook URL')}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* ── Credentials form ── */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-6 space-y-6"
          >
            <h3 className="font-semibold text-foreground">API Credentials</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Phone Number ID */}
              <div className="space-y-2">
                <Label>
                  Phone Number ID
                  <FieldHint text="Found in Meta Developers → WhatsApp → Getting Started. Looks like: 123456789012345" />
                </Label>
                <Input
                  placeholder="e.g. 123456789012345"
                  value={waConfig.phone_number_id}
                  onChange={e =>
                    setWaConfig(prev => ({ ...prev, phone_number_id: e.target.value.trim() }))
                  }
                />
              </div>

              {/* WhatsApp Business Account ID */}
              <div className="space-y-2">
                <Label>
                  WhatsApp Business Account ID
                  <FieldHint text="Found in Meta Business Manager → WhatsApp Accounts. Also called WABA ID." />
                </Label>
                <Input
                  placeholder="e.g. 987654321098765"
                  value={waConfig.business_account_id}
                  onChange={e =>
                    setWaConfig(prev => ({
                      ...prev,
                      business_account_id: e.target.value.trim(),
                    }))
                  }
                />
              </div>

              {/* App ID */}
              <div className="space-y-2">
                <Label>
                  App ID
                  <FieldHint text="Found at the top of your Meta App Dashboard. Optional but recommended." />
                </Label>
                <Input
                  placeholder="e.g. 1234567890"
                  value={waConfig.app_id}
                  onChange={e =>
                    setWaConfig(prev => ({ ...prev, app_id: e.target.value.trim() }))
                  }
                />
              </div>

              {/* API Version */}
              <div className="space-y-2">
                <Label>
                  API Version
                  <FieldHint text="WhatsApp Cloud API version. Use v21.0 or latest stable." />
                </Label>
                <Select
                  value={waConfig.api_version}
                  onValueChange={val =>
                    setWaConfig(prev => ({ ...prev, api_version: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['v22.0', 'v21.0', 'v20.0', 'v19.0', 'v18.0'].map(v => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Permanent Access Token */}
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Permanent Access Token
                  <FieldHint text="Generate a never-expiring token from Meta Business Manager → System Users. Must have whatsapp_business_messaging permission." />
                </Label>
                <div className="flex gap-2">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxx"
                    value={waConfig.access_token}
                    onChange={e =>
                      setWaConfig(prev => ({ ...prev, access_token: e.target.value.trim() }))
                    }
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowToken(v => !v)}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  {waConfig.access_token && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copy(waConfig.access_token, 'Access Token')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* App Secret */}
              <div className="space-y-2">
                <Label>
                  App Secret
                  <FieldHint text="Found in Meta App Dashboard → Settings → Basic. Used to verify webhook payloads." />
                </Label>
                <div className="flex gap-2">
                                    <Input
                    type={showAppSecret ? 'text' : 'password'}
                    placeholder="App secret (optional)"
                    value={waConfig.app_secret}
                    onChange={e =>
                      setWaConfig(prev => ({ ...prev, app_secret: e.target.value.trim() }))
                    }
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAppSecret(v => !v)}
                  >
                    {showAppSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-2">
                <Label>
                  Webhook Secret
                  <FieldHint text="An extra secret used to sign webhook payloads for additional security. Optional." />
                </Label>
                <div className="flex gap-2">
                  <Input
                    type={showWebhookSecret ? 'text' : 'password'}
                    placeholder="Webhook secret (optional)"
                    value={waConfig.webhook_secret}
                    onChange={e =>
                      setWaConfig(prev => ({
                        ...prev,
                        webhook_secret: e.target.value.trim(),
                      }))
                    }
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowWebhookSecret(v => !v)}
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Webhook Verify Token
                  <FieldHint text="A string you choose. Paste this same value in Meta → WhatsApp → Configuration → Webhook Verify Token. Used to verify your webhook endpoint." />
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. vb_abc123xyz"
                    value={waConfig.verify_token}
                    onChange={e =>
                      setWaConfig(prev => ({ ...prev, verify_token: e.target.value.trim() }))
                    }
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={generateVerifyToken}
                    title="Auto-generate"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                  {waConfig.verify_token && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copy(waConfig.verify_token, 'Verify Token')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this and paste it into Meta App → WhatsApp → Configuration → Verify Token
                </p>
              </div>

            </div>{/* end credentials grid */}

            {/* ── Auto-populated fields after verify ── */}
            {(waConfig.display_phone_number || waConfig.verified_name) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Display Number
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {waConfig.display_phone_number || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Verified Name
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {waConfig.verified_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Quality Rating
                  </p>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      waConfig.quality_rating === 'GREEN'
                        ? 'text-green-600'
                        : waConfig.quality_rating === 'YELLOW'
                        ? 'text-yellow-600'
                        : waConfig.quality_rating === 'RED'
                        ? 'text-red-600'
                        : 'text-foreground'
                    )}
                  >
                    {waConfig.quality_rating || '—'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Active toggle ── */}
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div>
                <p className="font-medium text-foreground">Enable WhatsApp Messaging</p>
                <p className="text-sm text-muted-foreground">
                  Turn off to pause all outgoing messages without deleting config
                </p>
              </div>
              <Switch
                checked={waConfig.is_active}
                onCheckedChange={checked =>
                  setWaConfig(prev => ({ ...prev, is_active: checked }))
                }
              />
            </div>

            {/* ── Action buttons ── */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={
                  isVerifying || !waConfig.phone_number_id || !waConfig.access_token
                }
                className="gap-2"
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isVerifying ? 'Verifying…' : 'Verify Connection'}
              </Button>

              <Button
                onClick={handleSaveWa}
                disabled={isSavingWa}
                className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground gap-2"
              >
                {isSavingWa ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingWa
                  ? 'Saving…'
                  : waExists
                  ? 'Update Configuration'
                  : 'Save Configuration'}
              </Button>
            </div>

          </motion.div>{/* end credentials card */}

        </TabsContent>{/* end WhatsApp API tab */}

      </Tabs>
    </motion.div>
  );
};

export default Settings;