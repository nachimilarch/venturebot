// src/pages/Campaigns.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  MessageSquare,
  Users,
  Calendar,
  Send,
  CheckCircle,
  RefreshCw,
  Clock,
  Zap,
  AlertCircle,
  Pause,
  Link2,
  BarChart2,
} from 'lucide-react';

import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TemplateApprovalStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'UNKNOWN';

interface MetaTemplate {
  id: string;
  name: string;
  status: TemplateApprovalStatus;
  category: string;
  language: string;
  bodyText: string;
  headerText: string | null;
  footerText: string | null;
  buttons: { type: string; text: string }[];
  updatedAt: string | null;
}

interface TemplateMap {
  [templateName: string]: MetaTemplate;
}

interface CampaignForm {
  name: string;
  type: string;
  targetAudience: string;
  message: string;
  templateName: string;
}

interface Campaign {
  id: number;
  name: string;
  type: string;
  targetAudience: string;
  message?: string | null;
  templateName?: string | null;
  status: string;
  createdAt: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  variant?: 'default' | 'destructive';
  onConfirm: (() => Promise<void> | void) | null;
}

const NONE_TEMPLATE_VALUE = '__none__';

interface CampaignFormFieldsProps {
  values: CampaignForm;
  onChange: (field: keyof CampaignForm, value: string) => void;
  prefix: string;
  metaTemplates: MetaTemplate[];
}

const CampaignFormFields: React.FC<CampaignFormFieldsProps> = ({
  values,
  onChange,
  prefix,
  metaTemplates,
}) => {
  const selectedTemplate = useMemo(
    () => metaTemplates.find((m) => m.name === values.templateName) ?? null,
    [metaTemplates, values.templateName]
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-name`}>Campaign Name</Label>
        <Input
          id={`${prefix}-name`}
          placeholder="Enter campaign name"
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-type`}>Campaign Type</Label>
        <Select value={values.type} onValueChange={(val) => onChange('type', val)}>
          <SelectTrigger id={`${prefix}-type`}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-audience`}>Target Audience</Label>
        <Select
          value={values.targetAudience}
          onValueChange={(val) => onChange('targetAudience', val)}
        >
          <SelectTrigger id={`${prefix}-audience`}>
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="new">New Leads</SelectItem>
            <SelectItem value="interested">Interested Leads</SelectItem>
            <SelectItem value="hot">Hot Leads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-template`}>
          WhatsApp Template
          <span className="ml-2 text-xs text-muted-foreground">(from your WABA)</span>
        </Label>

        {metaTemplates.length > 0 ? (
          <Select
            value={values.templateName || NONE_TEMPLATE_VALUE}
            onValueChange={(val) =>
              onChange('templateName', val === NONE_TEMPLATE_VALUE ? '' : val)
            }
          >
            <SelectTrigger id={`${prefix}-template`}>
              <SelectValue placeholder="Select an approved template" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value={NONE_TEMPLATE_VALUE}>— None —</SelectItem>
              {metaTemplates.map((t) => (
                <SelectItem key={t.id} value={t.name}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 flex-shrink-0 rounded-full',
                        t.status === 'APPROVED'
                          ? 'bg-green-500'
                          : t.status === 'PENDING'
                            ? 'bg-yellow-500'
                            : t.status === 'REJECTED'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                      )}
                    />
                    <span className="font-mono text-xs">{t.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({t.language})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`${prefix}-template`}
            placeholder="e.g. vaartabot_welcome"
            value={values.templateName}
            onChange={(e) => onChange('templateName', e.target.value)}
          />
        )}

        {selectedTemplate && (
          <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/50 p-3 text-xs">
            {selectedTemplate.headerText && (
              <p className="font-semibold text-foreground">{selectedTemplate.headerText}</p>
            )}
            <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">
              {selectedTemplate.bodyText || 'No body text'}
            </p>
            {selectedTemplate.footerText && (
              <p className="italic text-muted-foreground/60">
                {selectedTemplate.footerText}
              </p>
            )}
            {selectedTemplate.buttons.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedTemplate.buttons.map((b, i) => (
                  <span
                    key={`${b.type}-${b.text}-${i}`}
                    className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                  >
                    {b.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Only APPROVED templates can be sent to leads.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-message`}>Internal Notes</Label>
        <Textarea
          id={`${prefix}-message`}
          placeholder="Internal description for this campaign..."
          rows={2}
          value={values.message}
          onChange={(e) => onChange('message', e.target.value)}
        />
      </div>
    </div>
  );
};

const Campaigns: React.FC = () => {
  const { campaigns = [], refreshCampaigns } = useTenant() as {
    campaigns: Campaign[];
    refreshCampaigns?: () => Promise<void> | void;
  };

  const refreshCampaignsRef = useRef(refreshCampaigns);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    refreshCampaignsRef.current = refreshCampaigns;
  }, [refreshCampaigns]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [analyticsCampaign, setAnalyticsCampaign] = useState<Campaign | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [waConfig, setWaConfig] = useState<any>(null);
  const [isWaConfigured, setIsWaConfigured] = useState<boolean | null>(null);

  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [templateMap, setTemplateMap] = useState<TemplateMap>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    actionLabel: 'Continue',
    variant: 'default',
    onConfirm: null,
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const emptyForm: CampaignForm = {
    name: '',
    type: '',
    targetAudience: '',
    message: '',
    templateName: '',
  };

  const [editForm, setEditForm] = useState<CampaignForm>(emptyForm);

  const openConfirm = useCallback((config: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...config, open: true });
  }, []);

  const closeConfirm = useCallback(() => {
    if (isConfirming) return;
    setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
  }, [isConfirming]);

  const runConfirmedAction = useCallback(async () => {
    if (!confirmState.onConfirm) return;
    try {
      setIsConfirming(true);
      await confirmState.onConfirm();
      setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
    } finally {
      setIsConfirming(false);
    }
  }, [confirmState]);

  const fetchWaConfig = useCallback(async () => {
    try {
      const res = await axios.get('/api/whatsapp/config');
      if (res.data.success && res.data.config?.is_active) {
        setWaConfig(res.data.config);
        setIsWaConfigured(true);
      } else {
        setWaConfig(null);
        setIsWaConfigured(false);
      }
    } catch {
      setWaConfig(null);
      setIsWaConfigured(false);
    }
  }, []);

  useEffect(() => {
    fetchWaConfig();
  }, [fetchWaConfig]);

  const fetchMetaTemplates = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingTemplates(true);

    try {
      const res = await axios.get('/api/whatsapp/templates');
      if (!res.data.success) return;

      const raw: any[] = res.data.templates ?? [];

      const parsed: MetaTemplate[] = raw
        .map((t: any) => {
          const components: any[] = t.components ?? [];

          const header = components.find((c: any) => c.type === 'HEADER');
          const body = components.find((c: any) => c.type === 'BODY');
          const footer = components.find((c: any) => c.type === 'FOOTER');
          const btnComp = components.find((c: any) => c.type === 'BUTTONS');

          const buttons = (btnComp?.buttons ?? []).map((b: any) => ({
            type: b.type,
            text: b.text ?? b.url ?? b.phone_number ?? '',
          }));

          return {
            id: t.id,
            name: t.name,
            status: (t.status as TemplateApprovalStatus) ?? 'UNKNOWN',
            category: t.category ?? '',
            language: t.language ?? 'en',
            bodyText: body?.text ?? '',
            headerText: header?.text ?? null,
            footerText: footer?.text ?? null,
            buttons,
            updatedAt: t.last_updated_time ?? null,
          };
        })
        .sort((a, b) => {
          const order: Record<string, number> = {
            APPROVED: 0,
            PENDING: 1,
            REJECTED: 2,
            PAUSED: 3,
            UNKNOWN: 4,
          };
          return (order[a.status] ?? 5) - (order[b.status] ?? 5);
        });

      const nextMap: TemplateMap = {};
      parsed.forEach((t) => {
        nextMap[t.name] = t;
      });

      setMetaTemplates(parsed);
      setLastSyncedAt(new Date());

      setTemplateMap((prev) => {
        Object.entries(nextMap).forEach(([name, tmpl]) => {
          const previousStatus = prev[name]?.status;
          if (previousStatus === 'PENDING' && tmpl.status === 'APPROVED') {
            toast.success(`Template "${name}" approved by WhatsApp! 🎉`);
            void refreshCampaignsRef.current?.();
          }
          if (previousStatus === 'PENDING' && tmpl.status === 'REJECTED') {
            toast.error(`Template "${name}" was rejected by WhatsApp.`);
          }
        });
        return nextMap;
      });
    } catch (err) {
      if (!silent) toast.error('Could not fetch templates from Meta');
      console.error('[Campaigns] fetchMetaTemplates error:', err);
    } finally {
      if (!silent) setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    void fetchMetaTemplates();

    pollRef.current = setInterval(() => {
      void fetchMetaTemplates(true);
    }, 60_000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchMetaTemplates]);

  const linkedCampaignCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach((campaign) => {
      if (campaign.templateName) {
        counts[campaign.templateName] = (counts[campaign.templateName] ?? 0) + 1;
      }
    });
    return counts;
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const getTemplateBadge = useCallback(
    (templateName: string) => {
      const t = templateMap[templateName];
      const status = t?.status ?? 'UNKNOWN';

      const badges: Record<string, JSX.Element> = {
        APPROVED: (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" /> Approved
          </span>
        ),
        PENDING: (
          <span className="flex items-center gap-1 text-xs text-yellow-600">
            <Clock className="h-3 w-3 animate-pulse" /> Awaiting Approval
          </span>
        ),
        REJECTED: (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" /> Rejected
          </span>
        ),
        PAUSED: (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Pause className="h-3 w-3" /> Paused
          </span>
        ),
      };

      return (
        badges[status] ?? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span className="max-w-[140px] truncate font-mono">{templateName}</span>
          </span>
        )
      );
    },
    [templateMap]
  );

  const handleEditChange = (field: keyof CampaignForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAnalytics = async (campaign: Campaign) => {
    setAnalyticsCampaign(campaign);
    setAnalyticsData(null);
    setAnalyticsLoading(true);
    try {
      const { data } = await axios.get(`/api/campaigns/${campaign.id}/analytics`);
      setAnalyticsData(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditForm({
      name: campaign.name ?? '',
      type: campaign.type ?? '',
      targetAudience: campaign.targetAudience ?? '',
      message: campaign.message ?? '',
      templateName: campaign.templateName ?? '',
    });
    setEditCampaign(campaign);
  };

  const handleSaveEdit = async () => {
    if (!editCampaign) return;

    if (!editForm.name || !editForm.type || !editForm.targetAudience) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await axios.put(`/api/campaigns/${editCampaign.id}`, {
        name: editForm.name,
        type: editForm.type,
        targetAudience: editForm.targetAudience,
        message: editForm.message,
        templateName: editForm.templateName || null,
      });

      if (res.data.success) {
        toast.success('Campaign updated');
        setEditCampaign(null);
        await refreshCampaignsRef.current?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update campaign');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const performSendCampaign = async (campaignId: number, campaignName: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    const tmpl = campaign?.templateName ? templateMap[campaign.templateName] : null;

    if (isWaConfigured === null) {
      toast.error('Checking WhatsApp configuration. Please wait a moment.');
      return;
    }

    if (isWaConfigured === false) {
      toast.error('WhatsApp not configured. Go to Settings → WhatsApp API.');
      return;
    }

    if (!tmpl) {
      toast.error('No template linked to this campaign. Edit the campaign and select a template.');
      return;
    }

    if (tmpl.status !== 'APPROVED') {
      toast.error(`Template is "${tmpl.status}" — only APPROVED templates can be sent.`);
      return;
    }

    setActionLoading((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const res = await axios.post(`/api/campaigns/${campaignId}/send`);
      if (res.data.success) {
        toast.success(`✅ ${res.data.sent ?? 0} messages dispatched for "${campaignName}"`);
        await refreshCampaignsRef.current?.();
      } else {
        toast.error(res.data.error || 'Send failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send campaign');
    } finally {
      setActionLoading((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleSendCampaign = (campaignId: number, campaignName: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);

    openConfirm({
      title: 'Send campaign now?',
      description: `This will send "${campaignName}" to the selected "${campaign?.targetAudience ?? 'target'}" audience immediately.`,
      actionLabel: 'Send Campaign',
      variant: 'default',
      onConfirm: () => performSendCampaign(campaignId, campaignName),
    });
  };

  const performDeleteCampaign = async (campaignId: number) => {
    setActionLoading((prev) => ({ ...prev, [campaignId]: true }));
    try {
      await axios.delete(`/api/campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      await refreshCampaignsRef.current?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setActionLoading((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleDeleteCampaign = (campaignId: number, campaignName: string) => {
    openConfirm({
      title: 'Delete campaign?',
      description: `This will permanently delete "${campaignName}". This action cannot be undone.`,
      actionLabel: 'Delete Campaign',
      variant: 'destructive',
      onConfirm: () => performDeleteCampaign(campaignId),
    });
  };

  const renderTemplateAction = (campaign: Campaign) => {
    const tmpl = campaign.templateName ? templateMap[campaign.templateName] : null;

    if (isWaConfigured === null) {
      return (
        <DropdownMenuItem disabled className="text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Checking WhatsApp...
        </DropdownMenuItem>
      );
    }

    if (!campaign.templateName) {
      return (
        <DropdownMenuItem
          onClick={() => openEditDialog(campaign)}
          className="text-muted-foreground"
        >
          <Link2 className="mr-2 h-4 w-4" /> Link a Template
        </DropdownMenuItem>
      );
    }

    if (!tmpl) {
      return (
        <DropdownMenuItem disabled className="text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing template...
        </DropdownMenuItem>
      );
    }

    if (tmpl.status === 'APPROVED') {
      return (
        <DropdownMenuItem
          onClick={() => handleSendCampaign(campaign.id, campaign.name)}
          disabled={actionLoading[campaign.id] || isWaConfigured !== true}
          className="font-medium text-green-600"
        >
          <Send className="mr-2 h-4 w-4" />
          {actionLoading[campaign.id] ? 'Sending...' : 'Send to All Leads'}
        </DropdownMenuItem>
      );
    }

    if (tmpl.status === 'PENDING') {
      return (
        <DropdownMenuItem disabled className="text-yellow-600">
          <Clock className="mr-2 h-4 w-4 animate-pulse" /> Awaiting WhatsApp Approval
        </DropdownMenuItem>
      );
    }

    if (tmpl.status === 'REJECTED') {
      return (
        <DropdownMenuItem
          className="text-red-500"
          onClick={() => openEditDialog(campaign)}
        >
          <AlertCircle className="mr-2 h-4 w-4" /> Template Rejected — Edit Campaign
        </DropdownMenuItem>
      );
    }

    if (tmpl.status === 'PAUSED') {
      return (
        <DropdownMenuItem disabled className="text-gray-500">
          <Pause className="mr-2 h-4 w-4" /> Template Paused
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuItem disabled className="text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4" /> Template status unavailable
      </DropdownMenuItem>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const selectedViewTemplate = viewCampaign?.templateName
    ? templateMap[viewCampaign.templateName]
    : null;

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Campaigns</h1>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              WhatsApp marketing campaigns
              {lastSyncedAt && (
                <span className="text-xs text-muted-foreground/60">
                  · Templates synced {lastSyncedAt.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchMetaTemplates()}
              disabled={isLoadingTemplates}
              title="Sync templates from Meta"
            >
              <RefreshCw
                className={cn('mr-1 h-4 w-4', isLoadingTemplates && 'animate-spin')}
              />
              <span className="hidden text-xs sm:inline">
                {isLoadingTemplates ? 'Syncing...' : 'Sync Templates'}
              </span>
            </Button>
          </div>
        </motion.div>

        {isWaConfigured === false && (
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                WhatsApp not configured
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Go to{' '}
                <a href="/settings" className="font-medium underline">
                  Settings → WhatsApp API
                </a>{' '}
                to set up your Meta credentials before sending campaigns.
              </p>
            </div>
          </motion.div>
        )}

        {metaTemplates.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-tenant-accent" />
                <span className="text-sm font-semibold text-foreground">Meta Templates</span>
                <span className="text-xs text-muted-foreground">
                  ({metaTemplates.length} templates in your WABA)
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Rejected
                </span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {metaTemplates.map((t) => {
                const linked = linkedCampaignCounts[t.name] ?? 0;

                return (
                  <div
                    key={t.id}
                    className="flex items-start gap-4 px-5 py-3 transition-colors hover:bg-muted/20"
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full',
                        t.status === 'APPROVED'
                          ? 'bg-green-500'
                          : t.status === 'PENDING'
                            ? 'bg-yellow-500 animate-pulse'
                            : t.status === 'REJECTED'
                              ? 'bg-red-500'
                              : t.status === 'PAUSED'
                                ? 'bg-gray-400'
                                : 'bg-gray-300'
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {t.name}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {t.category}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {t.language}
                        </span>
                      </div>
                      {t.bodyText && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {t.bodyText}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {linked > 0 ? (
                        <span className="text-xs font-medium text-tenant-accent">
                          {linked} campaign{linked > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredCampaigns.map((campaign) => {
            const linkedTmpl = campaign.templateName
              ? templateMap[campaign.templateName]
              : null;

            return (
              <motion.div
                key={campaign.id}
                variants={itemVariants}
                className="card-hover flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-tenant-accent/30"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">{campaign.name}</h3>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {campaign.type}
                    </p>
                    {campaign.templateName && (
                      <div className="mt-1">{getTemplateBadge(campaign.templateName)}</div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewCampaign(campaign)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAnalytics(campaign)}>
                        <BarChart2 className="mr-2 h-4 w-4" /> Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(campaign)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      {renderTemplateAction(campaign)}
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                        disabled={actionLoading[campaign.id]}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {actionLoading[campaign.id] ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {linkedTmpl?.bodyText && (
                  <p className="mb-3 line-clamp-2 flex-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {linkedTmpl.bodyText}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="capitalize">{campaign.targetAudience}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(campaign.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredCampaigns.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-border bg-card py-12 text-center"
          >
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">No campaigns found</h3>
            <p className="mb-4 text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search'
                : 'No campaigns are available right now'}
            </p>
          </motion.div>
        )}

        <Dialog open={!!viewCampaign} onOpenChange={() => setViewCampaign(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" /> Campaign Details
              </DialogTitle>
            </DialogHeader>

            {viewCampaign && (
              <div className="space-y-4 pt-2">
                {[
                  { label: 'Campaign Name', value: viewCampaign.name },
                  { label: 'Type', value: viewCampaign.type },
                  { label: 'Target Audience', value: viewCampaign.targetAudience },
                  {
                    label: 'Created',
                    value: new Date(viewCampaign.createdAt).toLocaleString(),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium capitalize text-foreground">
                      {value}
                    </span>
                  </div>
                ))}

                {selectedViewTemplate ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      WhatsApp Template
                    </span>
                    <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {selectedViewTemplate.name}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            selectedViewTemplate.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                              : selectedViewTemplate.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                                : selectedViewTemplate.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400'
                          )}
                        >
                          {selectedViewTemplate.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedViewTemplate.category} · {selectedViewTemplate.language}
                        </span>
                      </div>

                      {selectedViewTemplate.headerText && (
                        <p className="text-sm font-semibold text-foreground">
                          {selectedViewTemplate.headerText}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedViewTemplate.bodyText}
                      </p>

                      {selectedViewTemplate.footerText && (
                        <p className="text-xs italic text-muted-foreground/60">
                          {selectedViewTemplate.footerText}
                        </p>
                      )}

                      {selectedViewTemplate.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 border-t border-border pt-1">
                          {selectedViewTemplate.buttons.map((b, i) => (
                            <span
                              key={`${b.type}-${b.text}-${i}`}
                              className="rounded-lg border border-border bg-background px-3 py-1 text-xs text-foreground"
                            >
                              {b.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : viewCampaign.templateName ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Template
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {viewCampaign.templateName}
                    </span>
                  </div>
                ) : null}

                {viewCampaign.message && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Internal Notes
                    </span>
                    <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-foreground">
                      {viewCampaign.message}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setViewCampaign(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!editCampaign}
          onOpenChange={(open) => {
            if (!open) setEditCampaign(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-4 w-4" /> Edit Campaign
              </DialogTitle>
            </DialogHeader>

            <CampaignFormFields
              values={editForm}
              onChange={handleEditChange}
              prefix="edit"
              metaTemplates={metaTemplates}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditCampaign(null)}>
                Cancel
              </Button>
              <Button
                className="bg-tenant-accent text-tenant-accent-foreground hover:bg-tenant-accent/90"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* ── Analytics dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!analyticsCampaign} onOpenChange={v => { if (!v) { setAnalyticsCampaign(null); setAnalyticsData(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              {analyticsCampaign?.name} — Analytics
            </DialogTitle>
          </DialogHeader>
          {analyticsLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : analyticsData ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Sent', value: analyticsData.stats.sent, color: 'text-blue-600' },
                  { label: 'Delivered', value: analyticsData.stats.delivered, color: 'text-green-600' },
                  { label: 'Read', value: analyticsData.stats.read, color: 'text-purple-600' },
                  { label: 'Failed', value: analyticsData.stats.failed, color: 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg border p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                {[
                  { label: 'Delivery rate', value: `${analyticsData.stats.deliveryRate}%` },
                  { label: 'Read rate', value: `${analyticsData.stats.readRate}%` },
                  { label: 'Status', value: analyticsData.status },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium capitalize">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmState.open} onOpenChange={(open) => !open && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runConfirmedAction();
              }}
              className={cn(
                confirmState.variant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              disabled={isConfirming}
            >
              {isConfirming ? 'Please wait...' : confirmState.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Campaigns;