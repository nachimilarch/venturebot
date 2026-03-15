import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Plus, Search, Filter, MoreHorizontal, Play, Pause, Trash2,
  Edit, Eye, MessageSquare, Users, Calendar,
  Send, CheckCircle, RefreshCw, Clock,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateStatus {
  [templateName: string]: 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNKNOWN';
}

interface CampaignForm {
  name: string;
  type: string;
  targetAudience: string;
  message: string;
  templateName: string;
}

// ─── CampaignFormFields — OUTSIDE component to prevent remount ───────────────

interface CampaignFormFieldsProps {
  values: CampaignForm;
  onChange: (field: string, value: string) => void;
  prefix: string;
}

const CampaignFormFields: React.FC<CampaignFormFieldsProps> = ({ values, onChange, prefix }) => (
  <div className="space-y-4 pt-4">
    <div className="space-y-2">
      <Label htmlFor={`${prefix}-name`}>Campaign Name</Label>
      <Input
        id={`${prefix}-name`}
        name={`${prefix}-name`}
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
      <Select value={values.targetAudience} onValueChange={(val) => onChange('targetAudience', val)}>
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
        WhatsApp Template Name
        <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
      </Label>
      <Input
        id={`${prefix}-template`}
        name={`${prefix}-template`}
        placeholder="e.g. pharmatrix_app_promo_appointments_labs"
        value={values.templateName}
        onChange={(e) => onChange('templateName', e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Enter your approved template name from Meta Business Manager
      </p>
    </div>

    <div className="space-y-2">
      <Label htmlFor={`${prefix}-message`}>Message / Description</Label>
      <Textarea
        id={`${prefix}-message`}
        name={`${prefix}-message`}
        placeholder="Describe this campaign..."
        rows={3}
        value={values.message}
        onChange={(e) => onChange('message', e.target.value)}
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Campaigns: React.FC = () => {
  const { campaigns, refreshCampaigns } = useTenant();

  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isSavingEdit, setIsSavingEdit]   = useState(false);
  const [isPolling, setIsPolling]         = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});
  const [templateStatuses, setTemplateStatuses] = useState<TemplateStatus>({});
  const [viewCampaign, setViewCampaign]   = useState<any | null>(null);
  const [editCampaign, setEditCampaign]   = useState<any | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emptyForm: CampaignForm = {
    name: '', type: '', targetAudience: '', message: '', templateName: '',
  };
  const [formData, setFormData] = useState<CampaignForm>(emptyForm);
  const [editForm, setEditForm] = useState<CampaignForm>(emptyForm);

  // ─── Template status polling ─────────────────────────────────────────────

  const fetchTemplateStatuses = async (silent = false) => {
    const withTemplates = campaigns.filter(c => c.templateName);
    if (withTemplates.length === 0) return;
    if (!silent) setIsPolling(true);

    try {
      const response = await axios.get('/api/whatsapp/templates');
      if (response.data.success) {
        const metaTemplates: { name: string; status: string }[] = response.data.templates;

        const statusMap: TemplateStatus = {};
        withTemplates.forEach(c => {
          const match = metaTemplates.find(t => t.name === c.templateName);
          statusMap[c.templateName!] = (match?.status as TemplateStatus[string]) || 'UNKNOWN';
        });

        setTemplateStatuses(prev => {
          Object.entries(statusMap).forEach(([name, status]) => {
            if (prev[name] === 'PENDING' && status === 'APPROVED') {
              toast.success(`Template "${name}" approved by WhatsApp! 🎉`);
              refreshCampaigns?.();
            }
            if (prev[name] === 'PENDING' && status === 'REJECTED') {
              toast.error(`Template "${name}" was rejected by WhatsApp.`);
            }
          });
          return statusMap;
        });
      }
    } catch (err) {
      console.error('[Campaigns] Template status fetch failed:', err);
    } finally {
      setIsPolling(false);
    }
  };

  useEffect(() => {
    fetchTemplateStatuses();
    pollIntervalRef.current = setInterval(() => fetchTemplateStatuses(true), 30_000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [campaigns.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers ────────────────────────────────────────────────────────────

  const getTemplateBadge = (templateName: string) => {
    const status = templateStatuses[templateName];
    switch (status) {
      case 'APPROVED':
        return (
          <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Template Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 animate-pulse" /> Awaiting Approval
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Template Rejected
          </span>
        );
      default:
        return (
          <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> {templateName}
          </span>
        );
    }
  };

  // ─── Form handlers ───────────────────────────────────────────────────────

  const handleInputChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleEditChange = (field: string, value: string) =>
    setEditForm(prev => ({ ...prev, [field]: value }));

  const openEditDialog = (campaign: any) => {
    setEditForm({
      name:           campaign.name           || '',
      type:           campaign.type           || '',
      targetAudience: campaign.targetAudience || '',
      message:        campaign.message        || '',
      templateName:   campaign.templateName   || '',
    });
    setEditCampaign(campaign);
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.type || !formData.targetAudience || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/campaigns', {
        name:           formData.name,
        type:           formData.type,
        targetAudience: formData.targetAudience,
        message:        formData.message,
        templateName:   formData.templateName || null,
        scheduledAt:    null,
      });
      if (res.data.success) {
        toast.success('Campaign created successfully');
        setIsCreateOpen(false);
        setFormData(emptyForm);
        await refreshCampaigns?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editCampaign) return;
    if (!editForm.name || !editForm.type || !editForm.targetAudience || !editForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await axios.put(`/api/campaigns/${editCampaign.id}`, {
        name:           editForm.name,
        type:           editForm.type,
        targetAudience: editForm.targetAudience,
        message:        editForm.message,
        templateName:   editForm.templateName || null,
      });
      if (res.data.success) {
        toast.success('Campaign updated successfully');
        setEditCampaign(null);
        await refreshCampaigns?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update campaign');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSendCampaign = async (campaignId: number, campaignName: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign?.templateName) {
      toast.error('No template linked to this campaign');
      return;
    }
    const tmplStatus = templateStatuses[campaign.templateName];
    if (tmplStatus !== 'APPROVED') {
      toast.error(`Template is ${tmplStatus?.toLowerCase() || 'not approved'} — cannot send yet`);
      return;
    }
    if (!confirm(`Send "${campaignName}" to all leads now?`)) return;

    setActionLoading(prev => ({ ...prev, [campaignId]: true }));
    try {
      const res = await axios.post(`/api/campaigns/${campaignId}/send`);
      if (res.data.success) {
        toast.success(`Sent! ${res.data.sent ?? 0} messages dispatched.`);
        await refreshCampaigns?.();
      } else {
        toast.error(res.data.error || 'Failed to send');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send campaign');
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleSubmitTemplate = async (campaignId: number) => {
    setActionLoading(prev => ({ ...prev, [campaignId]: true }));
    try {
      const res = await axios.post(`/api/campaigns/${campaignId}/submit-template`);
      if (res.data.success) {
        toast.success('Template submitted for WhatsApp approval');
        await refreshCampaigns?.();
        fetchTemplateStatuses();
      } else {
        toast.error(res.data.error || 'Failed to submit template');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit template');
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    setActionLoading(prev => ({ ...prev, [campaignId]: true }));
    try {
      await axios.delete(`/api/campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      await refreshCampaigns?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete campaign');
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // ─── Dropdown action resolver ────────────────────────────────────────────

  const renderTemplateAction = (campaign: any) => {
    const tmplName   = campaign.templateName;
    const tmplStatus = tmplName ? templateStatuses[tmplName] : null;

    if (tmplName && tmplStatus === 'APPROVED') {
      return (
        <DropdownMenuItem
          onClick={() => handleSendCampaign(campaign.id, campaign.name)}
          disabled={actionLoading[campaign.id]}
          className="text-green-600 font-medium"
        >
          <Send className="w-4 h-4 mr-2" />
          {actionLoading[campaign.id] ? 'Sending...' : 'Send to All Leads'}
        </DropdownMenuItem>
      );
    }

    if (tmplName && tmplStatus === 'PENDING') {
      return (
        <DropdownMenuItem disabled className="text-yellow-600">
          <Clock className="w-4 h-4 mr-2 animate-pulse" />
          Awaiting WhatsApp Approval
        </DropdownMenuItem>
      );
    }

    if (tmplName && tmplStatus === 'REJECTED') {
      return (
        <DropdownMenuItem
          onClick={() => handleSubmitTemplate(campaign.id)}
          disabled={actionLoading[campaign.id]}
          className="text-red-500"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {actionLoading[campaign.id] ? 'Resubmitting...' : 'Resubmit Template'}
        </DropdownMenuItem>
      );
    }

    // No template, UNKNOWN status, or template not yet loaded → always show Submit
    return (
      <DropdownMenuItem
        onClick={() => handleSubmitTemplate(campaign.id)}
        disabled={actionLoading[campaign.id]}
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        {actionLoading[campaign.id] ? 'Submitting...' : 'Submit for Approval'}
      </DropdownMenuItem>
    );
  };

  // ─── Filtered list ───────────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your WhatsApp marketing campaigns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTemplateStatuses()}
            disabled={isPolling}
            title="Refresh template statuses"
          >
            <RefreshCw className={cn('w-4 h-4', isPolling && 'animate-spin')} />
          </Button>

          {/* Create Dialog */}
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setFormData(emptyForm); }}
          >
            <DialogTrigger asChild>
              <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                <Plus className="w-4 h-4 mr-2" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <CampaignFormFields values={formData} onChange={handleInputChange} prefix="create" />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button
                  className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                  onClick={handleCreateCampaign}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Campaign Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredCampaigns.map((campaign) => (
          <motion.div
            key={campaign.id}
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-5 hover:border-tenant-accent/30 transition-all card-hover"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                <p className="text-sm text-muted-foreground capitalize mt-0.5">{campaign.type}</p>
                {campaign.templateName && getTemplateBadge(campaign.templateName)}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">

                  <DropdownMenuItem onClick={() => setViewCampaign(campaign)}>
                    <Eye className="w-4 h-4 mr-2" /> View Details
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => openEditDialog(campaign)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Resolved template action */}
                  {renderTemplateAction(campaign)}

                  {campaign.status === 'active' && (
                    <DropdownMenuItem>
                      <Pause className="w-4 h-4 mr-2" /> Pause
                    </DropdownMenuItem>
                  )}
                  {campaign.status === 'paused' && (
                    <DropdownMenuItem>
                      <Play className="w-4 h-4 mr-2" /> Resume
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    disabled={actionLoading[campaign.id]}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {actionLoading[campaign.id] ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="capitalize">{campaign.targetAudience}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12 bg-card rounded-xl border border-border"
        >
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No campaigns found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Create your first campaign to get started'}
          </p>
          <Button
            className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Campaign
          </Button>
        </motion.div>
      )}

      {/* ── View Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={!!viewCampaign} onOpenChange={() => setViewCampaign(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Campaign Details
            </DialogTitle>
          </DialogHeader>
          {viewCampaign && (
            <div className="space-y-4 pt-2">
              {(
                [
                  { label: 'Campaign Name',   value: viewCampaign.name },
                  { label: 'Type',            value: viewCampaign.type },
                  { label: 'Target Audience', value: viewCampaign.targetAudience },
                  { label: 'Template',        value: viewCampaign.templateName || '—' },
                  { label: 'Created',         value: new Date(viewCampaign.createdAt).toLocaleString() },
                ] as { label: string; value: string }[]
              ).map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-medium text-foreground capitalize">{value}</span>
                </div>
              ))}

              {viewCampaign.message && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Message / Description
                  </span>
                  <p className="text-sm text-foreground bg-muted rounded-lg p-3 whitespace-pre-wrap">
                    {viewCampaign.message}
                  </p>
                </div>
              )}

              {viewCampaign.templateName && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Template Approval Status
                  </span>
                  <div className="mt-1">{getTemplateBadge(viewCampaign.templateName)}</div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewCampaign(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog
        open={!!editCampaign}
        onOpenChange={(open) => { if (!open) setEditCampaign(null); }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit Campaign
            </DialogTitle>
          </DialogHeader>
          <CampaignFormFields values={editForm} onChange={handleEditChange} prefix="edit" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditCampaign(null)}>Cancel</Button>
            <Button
              className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};

export default Campaigns;
