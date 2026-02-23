import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Plus, Search, Filter, MoreHorizontal, Play, Pause, Trash2,
  Edit, Eye, MessageSquare, Users, ArrowUpRight, Calendar,
  Send, CheckCircle
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Campaigns: React.FC = () => {
  const { campaigns, refreshCampaigns } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<{[key: number]: boolean}>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    targetAudience: '',
    message: '',
    templateName: '' // Add template name field
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.type || !formData.targetAudience || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/campaigns', {
        name: formData.name,
        type: formData.type,
        targetAudience: formData.targetAudience,
        message: formData.message,
        templateName: formData.templateName || null,
        scheduledAt: null
      });

      if (response.data.success) {
        toast.success('Campaign created successfully');
        setIsCreateOpen(false);
        setFormData({ name: '', type: '', targetAudience: '', message: '', templateName: '' });
        if (refreshCampaigns) await refreshCampaigns();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send campaign using approved template
  // Submit template for approval
  const handleSubmitTemplate = async (campaignId: number) => {
    setActionLoading(prev => ({ ...prev, [campaignId]: true }));
    
    try {
      const response = await axios.post(`/api/campaigns/${campaignId}/submit-template`);
      
      if (response.data.success) {
        toast.success('Template submitted for WhatsApp approval');
        if (refreshCampaigns) await refreshCampaigns();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit template');
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setActionLoading(prev => ({ ...prev, [campaignId]: true }));
    
    try {
      await axios.delete(`/api/campaigns/${campaignId}`);
      toast.success('Campaign deleted successfully');
      if (refreshCampaigns) await refreshCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete campaign');
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-success';
      case 'pending': return 'status-warning';
      case 'completed': return 'status-info';
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'paused': return 'status-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your WhatsApp marketing campaigns
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input 
                  placeholder="Enter campaign name" 
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(val) => handleInputChange('targetAudience', val)}>
                  <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="new">New Leads</SelectItem>
                    <SelectItem value="interested">Interested Leads</SelectItem>
                    <SelectItem value="hot">Hot Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Approved Template Name Field */}
              <div className="space-y-2">
                <Label>
                  Approved WhatsApp Template Name
                  <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                </Label>
                <Input 
                  placeholder="e.g. pharmatrix_app_promo_appointments_labs" 
                  value={formData.templateName}
                  onChange={(e) => handleInputChange('templateName', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your approved template name from Meta Business Manager
                </p>
              </div>

              <div className="space-y-2">
                <Label>Message / Description</Label>
                <Textarea 
                  placeholder="Describe this campaign..."
                  rows={3}
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                  onClick={handleCreateCampaign}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Campaigns Grid */}
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
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                <p className="text-sm text-muted-foreground capitalize mt-1">{campaign.type}</p>
                {/* Show template name if linked */}
                {campaign.templateName && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Template: {campaign.templateName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('status-badge', getStatusColor(campaign.status))}>
                  {campaign.status}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Has approved template - Show SEND button */}
                    {campaign.templateName ? (
                      <DropdownMenuItem
                        onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                        disabled={actionLoading[campaign.id]}
                        className="text-green-600 font-medium"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {actionLoading[campaign.id] 
                          ? 'Sending...' 
                          : 'Send to All Leads'
                        }
                      </DropdownMenuItem>
                    ) : (
                      // No template - Show Submit for Approval
                      campaign.status === 'draft' && (
                        <DropdownMenuItem
                          onClick={() => handleSubmitTemplate(campaign.id)}
                          disabled={actionLoading[campaign.id]}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {actionLoading[campaign.id] ? 'Submitting...' : 'Submit for Approval'}
                        </DropdownMenuItem>
                      )
                    )}

                    {/* Pending approval status */}
                    {campaign.status === 'pending' && !campaign.templateName && (
                      <DropdownMenuItem disabled>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Awaiting WhatsApp Approval
                      </DropdownMenuItem>
                    )}

                    {campaign.status === 'active' ? (
                      <DropdownMenuItem>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </DropdownMenuItem>
                    ) : campaign.status === 'paused' ? (
                      <DropdownMenuItem>
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </DropdownMenuItem>
                    ) : null}

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
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-xs">Sent</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {campaign.messagesSent?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span className="text-xs">Open Rate</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {campaign.messagesSent > 0 
                    ? Math.round((campaign.opens / campaign.messagesSent) * 100) 
                    : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{campaign.targetAudience}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

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
              : 'Create your first campaign to get started'
            }
          </p>
          <Button 
            className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Campaigns;


