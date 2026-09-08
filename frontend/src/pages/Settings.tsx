// pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Key, Save, Eye, EyeOff, Copy,
  CheckCircle2, XCircle, Loader2,
  RefreshCw, Zap, Info, Bell, Clock, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent,
  TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppConfig {
  id?: number;
  phone_number_id:      string;
  business_account_id:  string;
  access_token:         string;
  app_id:               string;
  app_secret:           string;
  verify_token:         string;
  webhook_secret:       string;
  display_phone_number: string;
  verified_name:        string;
  api_version:          string;
  is_active:            boolean;
  is_verified:          boolean;
  quality_rating:       string;
  account_mode:         string;
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
  quality_rating:       'GREEN',
  account_mode:         'LIVE',
  api_version:          'v21.0',
  is_active:            true,
  is_verified:          false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Shared eye-toggle button to avoid repetition
const EyeToggle: React.FC<{ show: boolean; onToggle: () => void }> = ({ show, onToggle }) => (
  <Button variant="outline" size="icon" onClick={onToggle} type="button"
    aria-label={show ? 'Hide' : 'Show'}>
    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </Button>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  const [waConfig, setWaConfig]               = useState<WhatsAppConfig>(EMPTY_CONFIG);
  const [waExists, setWaExists]               = useState(false);
  const [isLoadingWa, setIsLoadingWa]         = useState(true);
  const [isSavingWa, setIsSavingWa]           = useState(false);
  const [isVerifying, setIsVerifying]         = useState(false);

  // Visibility toggles
  const [showToken, setShowToken]             = useState(false);
  const [showAppSecret, setShowAppSecret]     = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Webhook URL shown to user for pasting into Meta
  const [webhookUrl, setWebhookUrl]           = useState('');

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0  },
  };

  // ── Build webhook URL on mount ────────────────────────────────────────────
useEffect(() => {
  fetchWaConfig();
  fetchWebhookUrl();
}, []);

const fetchWebhookUrl = async () => {
  try {
    const res = await axios.get('/api/system/webhook-url');
    if (res.data.success && res.data.url) {
      setWebhookUrl(res.data.url);
    }
  } catch {
    // Silent fallback — still shows something useful
    const port = 3000;
    setWebhookUrl(`http://localhost:${port}/webhook`);
  }
};

  // ── Fetch & populate WhatsApp config ─────────────────────────────────────
  const fetchWaConfig = async () => {
    setIsLoadingWa(true);
    try {
      const res = await axios.get('/api/whatsapp/config');
      if (res.data.success && res.data.config) {
        const raw = res.data.config;
        setWaConfig({
          ...EMPTY_CONFIG,
          ...raw,
          is_active:   raw.is_active   === true || raw.is_active   === 1,
          is_verified: raw.is_verified === true || raw.is_verified === 1,
        });
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

  // ── Verify credentials against Meta Graph API ─────────────────────────────
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
        toast.success(`✅ Verified — ${res.data.verified_name} · ${res.data.phone_number}`);
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

  // ── Save config to DB ─────────────────────────────────────────────────────
  const handleSaveWa = async () => {
    const required: Array<{ key: keyof WhatsAppConfig; label: string }> = [
      { key: 'phone_number_id',     label: 'Phone Number ID'              },
      { key: 'business_account_id', label: 'WhatsApp Business Account ID' },
      { key: 'access_token',        label: 'Permanent Access Token'       },
      { key: 'verify_token',        label: 'Webhook Verify Token'         },
    ];
    for (const { key, label } of required) {
      if (!waConfig[key]) { toast.error(`${label} is required`); return; }
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
      await fetchWaConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save WhatsApp config');
    } finally {
      setIsSavingWa(false);
    }
  };

  // ── Auto-generate verify token ────────────────────────────────────────────
  const generateVerifyToken = () => {
    const token = 'vb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    setWaConfig(prev => ({ ...prev, verify_token: token }));
    toast.success('Verify token generated');
  };

  // ── Copy helper ───────────────────────────────────────────────────────────
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // ── Field change helper ───────────────────────────────────────────────────
  const set = (key: keyof WhatsAppConfig) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setWaConfig(prev => ({ ...prev, [key]: e.target.value.trim() }));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page header ── */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Connect and manage your WhatsApp Cloud API credentials
        </p>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          STATUS BANNER
      ══════════════════════════════════════════════════════ */}
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
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
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
            <Button variant="ghost" size="sm" onClick={fetchWaConfig} className="text-green-700 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

        ) : waExists && !waConfig.is_verified ? (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <XCircle className="w-5 h-5 text-yellow-600 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                Credentials saved but not verified
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Click <strong>Verify Connection</strong> below to test against Meta.
              </p>
            </div>
          </div>

        ) : (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <Zap className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300">
                WhatsApp not configured
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Fill in your Meta / WhatsApp Cloud API credentials below to start sending messages.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          WEBHOOK URL  (read-only, paste into Meta)
      ══════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="bg-card rounded-xl border border-border p-6 space-y-3"
      >
        <div>
          <h3 className="font-semibold text-foreground">Webhook URL</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste this in Meta App → WhatsApp → Configuration → Webhook URL
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

      {/* ══════════════════════════════════════════════════════
          CREDENTIALS FORM
      ══════════════════════════════════════════════════════ */}
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
              onChange={set('phone_number_id')}
            />
          </div>

          {/* WABA ID */}
          <div className="space-y-2">
            <Label>
              WhatsApp Business Account ID
              <FieldHint text="Found in Meta Business Manager → WhatsApp Accounts. Also called WABA ID." />
            </Label>
            <Input
              placeholder="e.g. 987654321098765"
              value={waConfig.business_account_id}
              onChange={set('business_account_id')}
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
              onChange={set('app_id')}
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
              onValueChange={val => setWaConfig(prev => ({ ...prev, api_version: val }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['v22.0', 'v21.0', 'v20.0', 'v19.0', 'v18.0'].map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permanent Access Token — full width */}
          <div className="space-y-2 md:col-span-2">
            <Label>
              Permanent Access Token
              <FieldHint text="Generate a never-expiring token from Meta Business Manager → System Users. Needs whatsapp_business_messaging permission." />
            </Label>
            <div className="flex gap-2">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxx"
                value={waConfig.access_token}
                onChange={set('access_token')}
                className="flex-1 font-mono text-sm"
              />
              <EyeToggle show={showToken} onToggle={() => setShowToken(v => !v)} />
              {waConfig.access_token && (
                <Button variant="outline" size="icon"
                  onClick={() => copy(waConfig.access_token, 'Access Token')}>
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* App Secret */}
          <div className="space-y-2">
            <Label>
              App Secret
              <FieldHint text="Found in Meta App → Settings → Basic. Used to verify webhook payload signatures." />
            </Label>
            <div className="flex gap-2">
              <Input
                type={showAppSecret ? 'text' : 'password'}
                placeholder="App secret (optional)"
                value={waConfig.app_secret}
                onChange={set('app_secret')}
                className="flex-1 font-mono text-sm"
              />
              <EyeToggle show={showAppSecret} onToggle={() => setShowAppSecret(v => !v)} />
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
                onChange={set('webhook_secret')}
                className="flex-1 font-mono text-sm"
              />
              <EyeToggle show={showWebhookSecret} onToggle={() => setShowWebhookSecret(v => !v)} />
            </div>
          </div>

          {/* Webhook Verify Token — full width */}
          <div className="space-y-2 md:col-span-2">
            <Label>
              Webhook Verify Token
              <FieldHint text="A string you choose. Paste this same value in Meta → WhatsApp → Configuration → Webhook Verify Token." />
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. vb_abc123xyz"
                value={waConfig.verify_token}
                onChange={set('verify_token')}
                className="flex-1 font-mono text-sm"
              />
              <Button variant="outline" onClick={generateVerifyToken} type="button">
                <RefreshCw className="w-4 h-4 mr-1" /> Generate
              </Button>
              {waConfig.verify_token && (
                <Button variant="outline" size="icon"
                  onClick={() => copy(waConfig.verify_token, 'Verify Token')}>
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this and paste it into Meta App → WhatsApp → Configuration → Verify Token
            </p>
          </div>

        </div>{/* end credentials grid */}

        {/* ── Auto-populated after verify ── */}
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
              <p className={cn(
                'text-sm font-medium',
                waConfig.quality_rating === 'GREEN'  && 'text-green-600',
                waConfig.quality_rating === 'YELLOW' && 'text-yellow-600',
                waConfig.quality_rating === 'RED'    && 'text-red-600',
              )}>
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
              Turn off to pause all outgoing messages without deleting your config
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
            disabled={isVerifying || !waConfig.phone_number_id || !waConfig.access_token}
            className="gap-2"
            type="button"
          >
            {isVerifying
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Zap      className="w-4 h-4" />
            }
            {isVerifying ? 'Verifying…' : 'Verify Connection'}
          </Button>

          <Button
            onClick={handleSaveWa}
            disabled={isSavingWa}
            className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground gap-2"
            type="button"
          >
            {isSavingWa
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save     className="w-4 h-4" />
            }
            {isSavingWa ? 'Saving…' : waExists ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        </div>

      </motion.div>{/* end credentials card */}

      {/* ── Business Hours ───────────────────────────────────────────────── */}
      <BusinessHoursCard />

      {/* ── Notifications / Credit Alert ─────────────────────────────────── */}
      <CreditAlertCard />

      {/* ── Invoice Download ──────────────────────────────────────────────── */}
      <InvoiceCard />

    </motion.div>
  );
};

// ─── Business Hours Card ───────────────────────────────────────────────────────
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS: Record<string, string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu',
  friday:'Fri', saturday:'Sat', sunday:'Sun',
};

const DEFAULT_HOURS = Object.fromEntries(DAYS.map(d => [
  d, { active: !['saturday','sunday'].includes(d), start: '09:00', end: '18:00' }
]));

const BusinessHoursCard: React.FC = () => {
  const [hours, setHours]   = useState<Record<string, any>>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/tenant-settings').then(({ data }) => {
      if (data.data?.business_hours) setHours(data.data.business_hours);
    }).catch(() => {});
  }, []);

  const toggle  = (d: string) => setHours(h => ({ ...h, [d]: { ...h[d], active: !h[d].active } }));
  const setTime = (d: string, field: 'start'|'end', val: string) =>
    setHours(h => ({ ...h, [d]: { ...h[d], [field]: val } }));

  const save = async () => {
    setSaving(true);
    try {
      await axios.put('/api/tenant-settings/business_hours', { value: hours });
      toast.success('Business hours saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
      className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Business Hours</h2>
      </div>
      <p className="text-sm text-muted-foreground">The inbox shows a warning when customers message outside these hours.</p>
      <div className="space-y-2">
        {DAYS.map(d => (
          <div key={d} className="flex items-center gap-3">
            <Switch checked={hours[d]?.active} onCheckedChange={() => toggle(d)} />
            <span className="w-10 text-sm font-medium">{DAY_LABELS[d]}</span>
            {hours[d]?.active ? (
              <div className="flex items-center gap-1.5 text-sm">
                <Input type="time" value={hours[d].start} onChange={e => setTime(d,'start',e.target.value)}
                  className="h-8 w-28 text-xs" />
                <span className="text-muted-foreground">–</span>
                <Input type="time" value={hours[d].end} onChange={e => setTime(d,'end',e.target.value)}
                  className="h-8 w-28 text-xs" />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Closed</span>
            )}
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={saving} size="sm" className="gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save hours'}
      </Button>
    </motion.div>
  );
};

// ─── Credit Alert Card ─────────────────────────────────────────────────────────
const CreditAlertCard: React.FC = () => {
  const [threshold, setThreshold] = useState('50');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    axios.get('/api/tenant-settings').then(({ data }) => {
      if (data.data?.credit_alert_threshold != null)
        setThreshold(String(data.data.credit_alert_threshold));
    }).catch(() => {});
  }, []);

  const save = async () => {
    const val = parseInt(threshold);
    if (isNaN(val) || val < 0) return toast.error('Enter a valid number');
    setSaving(true);
    try {
      await axios.put('/api/tenant-settings/credit_alert_threshold', { value: val });
      toast.success('Alert threshold saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
      className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Low Credit Alert</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        An email alert is sent to your admin email when credits fall below this threshold.
        Requires SMTP to be configured on the server.
      </p>
      <div className="flex items-center gap-3 max-w-xs">
        <Label className="whitespace-nowrap">Alert at</Label>
        <Input type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} className="w-28" />
        <span className="text-sm text-muted-foreground">credits</span>
      </div>
      <Button onClick={save} disabled={saving} size="sm" className="gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save threshold'}
      </Button>
    </motion.div>
  );
};

// ─── Invoice Card ──────────────────────────────────────────────────────────────
const InvoiceCard: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`
  );

  const download = () => {
    window.open(`/api/tenant-settings/invoice/${month}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
      className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Invoice</h2>
      </div>
      <p className="text-sm text-muted-foreground">Download a printable invoice for any billing month.</p>
      <div className="flex items-center gap-3">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-44" />
        <Button size="sm" onClick={download} className="gap-1.5">
          <FileText className="w-4 h-4" /> Open Invoice
        </Button>
      </div>
    </motion.div>
  );
};

export default Settings;