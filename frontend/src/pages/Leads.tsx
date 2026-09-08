// pages/Leads.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Plus, Search, Filter, MoreHorizontal, Edit, Trash2,
  Phone, Mail, User, Tag, Banknote, RefreshCw,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label }    from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn }       from '@/lib/utils';
import { toast }    from 'sonner';


// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id:          number;
  name:        string;
  email:       string;
  phone:       string;
  status:      string;
  source:      string;
  property:    string;   // "interest / service" in UI — DB column unchanged
  budget:      string;   // "budget / value"     in UI — DB column unchanged
  notes:       string;
  assigned_to: string;
  score:       number;
  created_at:  string;
}

interface FormState {
  name:       string;
  email:      string;
  phone:      string;
  status:     string;
  source:     string;
  property:   string;
  budget:     string;
  notes:      string;
  assignedTo: string;
}


// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:         { label: 'New',         className: 'bg-blue-100   text-blue-800'   },
  contacted:   { label: 'Contacted',   className: 'bg-yellow-100 text-yellow-800' },
  qualified:   { label: 'Qualified',   className: 'bg-indigo-100 text-indigo-800' },
  interested:  { label: 'Interested',  className: 'bg-green-100  text-green-800'  },
  appointment: { label: 'Appointment', className: 'bg-purple-100 text-purple-800' },
  closed:      { label: 'Closed',      className: 'bg-gray-100   text-gray-700'   },
  lost:        { label: 'Lost',        className: 'bg-red-100    text-red-700'    },
  opt_out:     { label: 'Opt-out',     className: 'bg-orange-100 text-orange-700' },
};

const EMPTY_FORM: FormState = {
  name: '', email: '', phone: '', status: 'new',
  source: '', property: '', budget: '', notes: '', assignedTo: '',
};


// ─── FormFields ───────────────────────────────────────────────────────────────
// MUST be defined OUTSIDE the parent component.
// If defined inside, every parent re-render (i.e. every keystroke) creates a
// new function reference → React unmounts + remounts the component → focus lost.

interface FormFieldsProps {
  data:     FormState;
  onChange: (field: keyof FormState, value: string) => void;
}

const FormFields: React.FC<FormFieldsProps> = ({ data, onChange }) => (
  <div className="space-y-4 pt-4 max-h-[560px] overflow-y-auto pr-1">

    {/* Name + Phone */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="lead-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="lead-name"
          placeholder="Full name"
          value={data.name}
          onChange={e => onChange('name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-phone">
          Phone <span className="text-destructive">*</span>
        </Label>
        <Input
          id="lead-phone"
          placeholder="91XXXXXXXXXX"
          value={data.phone}
          onChange={e => onChange('phone', e.target.value)}
        />
      </div>
    </div>

    {/* Email */}
    <div className="space-y-2">
      <Label htmlFor="lead-email">Email</Label>
      <Input
        id="lead-email"
        type="email"
        placeholder="name@example.com"
        value={data.email}
        onChange={e => onChange('email', e.target.value)}
      />
    </div>

    {/* Status + Source */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={data.status} onValueChange={v => onChange('status', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-source">Source</Label>
        <Input
          id="lead-source"
          placeholder="Website, Referral, Ad…"
          value={data.source}
          onChange={e => onChange('source', e.target.value)}
        />
      </div>
    </div>

    {/* Interest + Budget */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="lead-property">Interest / Service</Label>
        <Input
          id="lead-property"
          placeholder="What they're interested in"
          value={data.property}
          onChange={e => onChange('property', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-budget">Budget / Value</Label>
        <Input
          id="lead-budget"
          placeholder="e.g. ₹50k, ₹5L, TBD"
          value={data.budget}
          onChange={e => onChange('budget', e.target.value)}
        />
      </div>
    </div>

    {/* Notes */}
    <div className="space-y-2">
      <Label htmlFor="lead-notes">Notes</Label>
      <Textarea
        id="lead-notes"
        placeholder="Any additional context…"
        rows={3}
        value={data.notes}
        onChange={e => onChange('notes', e.target.value)}
      />
    </div>
  </div>
);


// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

const Leads: React.FC = () => {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData]         = useState<FormState>(EMPTY_FORM);

  // Stable onChange — does NOT recreate FormFields
  const handleInputChange = useCallback(
    (field: keyof FormState, value: string) =>
      setFormData(prev => ({ ...prev, [field]: value })),
    []
  );

  const resetForm = () => setFormData(EMPTY_FORM);

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/leads');
      if (res.data.success) setLeads(res.data.data);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ─── Create ──────────────────────────────────────────────────────────────
  const handleCreateLead = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/leads', formData);
      if (res.data.success) {
        toast.success('Lead created successfully');
        setIsCreateOpen(false);
        resetForm();
        await fetchLeads();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Update ──────────────────────────────────────────────────────────────
  const handleEditLead = async () => {
    if (!selectedLead) return;
    setIsSubmitting(true);
    try {
      const res = await axios.put(`/api/leads/${selectedLead.id}`, formData);
      if (res.data.success) {
        toast.success('Lead updated successfully');
        setIsEditOpen(false);
        setSelectedLead(null);
        resetForm();
        await fetchLeads();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await axios.delete(`/api/leads/${leadId}`);
      if (res.data.success) {
        toast.success('Lead deleted');
        setLeads(prev => prev.filter(l => l.id !== leadId)); // optimistic
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete lead');
    }
  };

  // ─── Open edit ────────────────────────────────────────────────────────────
  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name:       lead.name,
      email:      lead.email       ?? '',
      phone:      lead.phone,
      status:     lead.status,
      source:     lead.source      ?? '',
      property:   lead.property    ?? '',
      budget:     lead.budget      ?? '',
      notes:      lead.notes       ?? '',
      assignedTo: lead.assigned_to ?? '',
    });
    setIsEditOpen(true);
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(q) ||
      lead.phone.includes(q) ||
      (lead.email ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {leads.length > 0
              ? `${leads.length} lead${leads.length !== 1 ? 's' : ''} total`
              : 'Add and manage your contacts and prospects'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="icon"
            onClick={fetchLeads} disabled={isLoading} title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>

          {/* ── Create dialog ── */}
          <Dialog
            open={isCreateOpen}
            onOpenChange={open => { setIsCreateOpen(open); if (!open) resetForm(); }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <FormFields data={formData} onChange={handleInputChange} />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleCreateLead}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Adding…</>
                    : <><Plus className="w-4 h-4 mr-2" /> Add Lead</>
                  }
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email…"
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Interest / Service</th>
                <th>Budget / Value</th>
                <th>Status</th>
                <th>Source</th>
                <th>Added</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Skeleton rows while loading
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div className="h-4 bg-muted/50 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                filteredLeads.map(lead => {
                  const statusCfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG['new'];
                  return (
                    <tr key={lead.id} className="group">

                      {/* Lead identity */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm leading-tight">
                              {lead.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Score: {lead.score ?? 0}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-foreground">{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground truncate max-w-[160px]">
                                {lead.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Interest / Service */}
                      <td>
                        {lead.property ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-foreground">{lead.property}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Budget / Value */}
                      <td>
                        {lead.budget ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Banknote className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-foreground">{lead.budget}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          statusCfg.className
                        )}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="text-sm text-muted-foreground">
                        {lead.source || '—'}
                      </td>

                      {/* Date added */}
                      <td className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteLead(lead.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!isLoading && filteredLeads.length === 0 && (
          <div className="text-center py-14">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-lg font-medium text-foreground mb-1">No leads found</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Add your first lead to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Lead
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Edit dialog ── */}
      <Dialog
        open={isEditOpen}
        onOpenChange={open => {
          setIsEditOpen(open);
          if (!open) { setSelectedLead(null); resetForm(); }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <FormFields data={formData} onChange={handleInputChange} />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { setIsEditOpen(false); setSelectedLead(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleEditLead}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                : 'Save Changes'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};

export default Leads;