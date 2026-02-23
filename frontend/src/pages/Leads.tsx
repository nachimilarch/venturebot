import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  MapPin,
  DollarSign
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  property: string;
  budget: string;
  notes: string;
  assigned_to: string;
  score: number;
  created_at: string;
}

const Leads: React.FC = () => {
  const { leads: contextLeads } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'new',
    source: '',
    property: '',
    budget: '',
    notes: '',
    assignedTo: ''
  });

  // Load leads from context or fetch directly
  useEffect(() => {
    if (contextLeads && contextLeads.length > 0) {
      setLeads(contextLeads);
    } else {
      fetchLeads();
    }
  }, [contextLeads]);

  const fetchLeads = async () => {
    try {
      const response = await axios.get('/api/leads');
      if (response.data.success) {
        setLeads(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateLead = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/leads', formData);

      if (response.data.success) {
        toast.success('Lead created successfully');
        setIsCreateOpen(false);
        resetForm();
        await fetchLeads();
      }
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      toast.error(error.response?.data?.error || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLead = async () => {
    if (!selectedLead) return;

    setIsSubmitting(true);

    try {
      const response = await axios.put(`/api/leads/${selectedLead.id}`, formData);

      if (response.data.success) {
        toast.success('Lead updated successfully');
        setIsEditOpen(false);
        setSelectedLead(null);
        resetForm();
        await fetchLeads();
      }
    } catch (error: any) {
      console.error('Failed to update lead:', error);
      toast.error(error.response?.data?.error || 'Failed to update lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/leads/${leadId}`);

      if (response.data.success) {
        toast.success('Lead deleted successfully');
        await fetchLeads();
      }
    } catch (error: any) {
      console.error('Failed to delete lead:', error);
      toast.error(error.response?.data?.error || 'Failed to delete lead');
    }
  };

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      source: lead.source || '',
      property: lead.property || '',
      budget: lead.budget || '',
      notes: lead.notes || '',
      assignedTo: lead.assigned_to || ''
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'new',
      source: '',
      property: '',
      budget: '',
      notes: '',
      assignedTo: ''
    });
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'interested': return 'bg-green-100 text-green-800';
      case 'appointment': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your property leads
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    placeholder="John Doe" 
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input 
                    placeholder="919876543210" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  placeholder="john@example.com" 
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(val) => handleInputChange('status', val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input 
                    placeholder="Website, Referral, etc." 
                    value={formData.source}
                    onChange={(e) => handleInputChange('source', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Interest</Label>
                  <Input 
                    placeholder="2BHK Apartment" 
                    value={formData.property}
                    onChange={(e) => handleInputChange('property', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <Input 
                    placeholder="50-75 Lakhs" 
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Additional information..." 
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  className="bg-tenant-accent hover:bg-tenant-accent/90"
                  onClick={handleCreateLead}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-10"
            value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="appointment">Appointment</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Property Interest</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Source</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-tenant-accent/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-tenant-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">Score: {lead.score || 0}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{lead.phone}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{lead.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{lead.property || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{lead.budget || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={cn('status-badge capitalize', getStatusColor(lead.status))}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{lead.source || '-'}</td>
                  <td className="text-muted-foreground text-sm">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Create your first lead to get started'}
            </p>
            <Button 
              className="bg-tenant-accent hover:bg-tenant-accent/90"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input 
                  placeholder="919876543210" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                placeholder="john@example.com" 
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => handleInputChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input 
                  placeholder="Website, Referral, etc." 
                  value={formData.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Interest</Label>
                <Input 
                  placeholder="2BHK Apartment" 
                  value={formData.property}
                  onChange={(e) => handleInputChange('property', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Budget</Label>
                <Input 
                  placeholder="50-75 Lakhs" 
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Additional information..." 
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedLead(null); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                className="bg-tenant-accent hover:bg-tenant-accent/90"
                onClick={handleEditLead}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Lead'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Leads;

