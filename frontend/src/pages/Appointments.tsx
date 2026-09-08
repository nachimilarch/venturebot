// pages/Appointments.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Plus, Calendar as CalendarIcon, Clock, User, Phone,
  MoreHorizontal, Check, X, ChevronLeft, ChevronRight,
  Bot, RefreshCw, Bookmark, UserPlus,
} from 'lucide-react';
import { Button }  from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn }    from '@/lib/utils';
import { toast } from 'sonner';


// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  id:          string;
  lead_id:     string;
  lead_name?:  string;
  lead_phone?: string;
  date:        string;
  time:        string;
  type:        string;
  status:      'scheduled' | 'completed' | 'cancelled';
  notes?:      string;
  booked_via?: string;
  created_at:  string;
}

interface Lead {
  id:    string;
  name:  string;
  phone: string;
}

interface FormState {
  // existing-lead mode
  lead_id:     string;
  // new-contact mode
  new_name:    string;
  new_phone:   string;
  is_new_lead: boolean;
  // shared
  date:        string;
  time:        string;
  type:        string;
  notes:       string;
}


// ─── Constants ────────────────────────────────────────────────────────────────

const APPT_TYPES = [
  { value: 'Initial Meeting',    label: 'Initial Meeting'    },
  { value: 'Follow-up',          label: 'Follow-up'          },
  { value: 'Demo / Walkthrough', label: 'Demo / Walkthrough' },
  { value: 'Consultation',       label: 'Consultation'       },
  { value: 'Review Session',     label: 'Review Session'     },
  { value: 'Onboarding Call',    label: 'Onboarding Call'    },
  { value: 'Other',              label: 'Other'              },
];

const EMPTY_FORM: FormState = {
  lead_id: '', new_name: '', new_phone: '',
  is_new_lead: false,
  date: '', time: '', type: '', notes: '',
};

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'    },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'         },
} as const;


// ─── BookedViaBadge ───────────────────────────────────────────────────────────

const BookedViaBadge = ({ via }: { via?: string }) =>
  via === 'whatsapp_bot' ? (
    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full px-2 py-0.5">
      <Bot className="w-3 h-3" /> WhatsApp Bot
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
      <User className="w-3 h-3" />
      {via === 'dashboard' ? 'Manual' : (via ?? 'Manual')}
    </span>
  );


// ─── FormFields ───────────────────────────────────────────────────────────────
// Defined OUTSIDE parent component to prevent re-mount on every render.

interface FormFieldsProps {
  form:     FormState;
  leads:    Lead[];
  onChange: (patch: Partial<FormState>) => void;
}

const FormFields: React.FC<FormFieldsProps> = ({ form, leads, onChange }) => (
  <div className="space-y-4 pt-2">

    {/* ── Contact mode toggle ── */}
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange({ is_new_lead: false, new_name: '', new_phone: '' })}
        className={cn(
          'py-2 text-sm rounded-lg border transition-colors font-medium',
          !form.is_new_lead
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:border-primary/60'
        )}
      >
        Existing Contact
      </button>
      <button
        type="button"
        onClick={() => onChange({ is_new_lead: true, lead_id: '' })}
        className={cn(
          'py-2 text-sm rounded-lg border transition-colors font-medium inline-flex items-center justify-center gap-1.5',
          form.is_new_lead
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:border-primary/60'
        )}
      >
        <UserPlus className="w-3.5 h-3.5" /> New Contact
      </button>
    </div>

    {/* ── Existing contact dropdown ── */}
    {!form.is_new_lead && (
      <div className="space-y-2">
        <Label>Contact <span className="text-destructive">*</span></Label>
        <Select value={form.lead_id} onValueChange={v => onChange({ lead_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a contact" />
          </SelectTrigger>
          <SelectContent>
            {leads.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No contacts found
              </div>
            ) : (
              leads.map(lead => (
                <SelectItem key={lead.id} value={String(lead.id)}>
                  {lead.name}{lead.phone ? ` · ${lead.phone}` : ''}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    )}

    {/* ── New contact fields ── */}
    {form.is_new_lead && (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name <span className="text-destructive">*</span></Label>
          <Input
            placeholder="John Doe"
            value={form.new_name}
            onChange={e => onChange({ new_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone <span className="text-destructive">*</span></Label>
          <Input
            type="tel"
            placeholder="9876543210"
            value={form.new_phone}
            onChange={e => onChange({ new_phone: e.target.value })}
          />
        </div>
      </div>
    )}

    {/* ── Date + Time ── */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Date <span className="text-destructive">*</span></Label>
        <Input
          type="date"
          min={new Date().toISOString().split('T')[0]}
          value={form.date}
          onChange={e => onChange({ date: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Time <span className="text-destructive">*</span></Label>
        <Input
          type="time"
          value={form.time}
          onChange={e => onChange({ time: e.target.value })}
        />
      </div>
    </div>

    {/* ── Appointment type ── */}
    <div className="space-y-2">
      <Label>Appointment Type <span className="text-destructive">*</span></Label>
      <Select value={form.type} onValueChange={v => onChange({ type: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          {APPT_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* ── Notes ── */}
    <div className="space-y-2">
      <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
      <Input
        placeholder="Any additional context…"
        value={form.notes}
        onChange={e => onChange({ notes: e.target.value })}
      />
    </div>
  </div>
);


// ─── SkeletonRows ─────────────────────────────────────────────────────────────

const SkeletonRows = () => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length: 6 }).map((_, j) => (
          <td key={j}>
            <div className="h-4 bg-muted/50 rounded animate-pulse" />
          </td>
        ))}
      </tr>
    ))}
  </>
);


// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apiLeads, setApiLeads]         = useState<Lead[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [view, setView]                 = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);

  const patchForm = (patch: Partial<FormState>) =>
    setForm(prev => ({ ...prev, ...patch }));

  // ─── Fetch appointments ────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/appointments');
      const rows = res.data?.data || res.data || [];
      setAppointments(rows.map((a: any) => ({ ...a, id: String(a.id) })));
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Fetch leads ───────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await axios.get('/api/leads');
      const rows = res.data?.data || res.data || [];
      setApiLeads(rows.map((l: any) => ({
        id:    String(l.id),
        name:  l.name  ?? 'Unknown',
        phone: l.phone ?? '',
      })));
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchLeads();
  }, [fetchAppointments, fetchLeads]);

  // ─── Create ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    // Validate based on mode
    if (form.is_new_lead) {
      if (!form.new_name.trim() || !form.new_phone.trim() || !form.date || !form.time || !form.type) {
        toast.error('Please fill in name, phone, date, time and type');
        return;
      }
    } else {
      if (!form.lead_id || !form.date || !form.time || !form.type) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = form.is_new_lead
        ? {
            new_name:  form.new_name.trim(),
            new_phone: form.new_phone.trim(),
            date: form.date, time: form.time,
            type: form.type, notes: form.notes,
          }
        : {
            lead_id: form.lead_id,
            date: form.date, time: form.time,
            type: form.type, notes: form.notes,
          };

      const res = await axios.post('/api/appointments', payload);
      const newAppt: Appointment | null = res.data?.data
        ? { ...res.data.data, id: String(res.data.data.id) }
        : null;

      toast.success('Appointment booked');
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);

      if (newAppt) {
        // Prepend to list — no extra fetch needed
        setAppointments(prev => [newAppt, ...prev]);
        // If a new lead was created, refresh the leads dropdown too
        if (form.is_new_lead) fetchLeads();
      } else {
        await fetchAppointments();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Status change ─────────────────────────────────────────────────────
  const handleStatusChange = async (
    id: string,
    status: 'completed' | 'cancelled'
  ) => {
    // Optimistic — preserve lead_name / lead_phone
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status } : a)
    );
    try {
      await axios.patch(`/api/appointments/${id}`, { status });
      toast.success(`Marked as ${STATUS_CONFIG[status].label.toLowerCase()}`);
    } catch {
      toast.error('Failed to update appointment');
      await fetchAppointments(); // rollback
    }
  };

  // ─── Calendar helpers ──────────────────────────────────────────────────
  const getDaysInMonth = (date: Date): (number | null)[] => {
    const year     = date.getFullYear();
    const month    = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDay  = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= lastDay; i++) days.push(i);
    return days;
  };

  const getAppointmentsForDay = (day: number) => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return appointments.filter(a => {
      const dateStr = typeof a.date === 'string'
        ? a.date.slice(0, 10)
        : new Date(a.date).toISOString().slice(0, 10);
      return dateStr === `${y}-${m}-${d}`;
    });
  };

  const isToday = (day: number) => {
    const t = new Date();
    return day === t.getDate() &&
      currentDate.getMonth() === t.getMonth() &&
      currentDate.getFullYear() === t.getFullYear();
  };

  const navigateMonth = (dir: 'prev' | 'next') =>
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });

  // ─── Derived ───────────────────────────────────────────────────────────
  const sorted = [...appointments].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return diff !== 0 ? diff : a.time.localeCompare(b.time);
  });

  const stats = {
    total:     appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    fromBot:   appointments.filter(a => a.booked_via === 'whatsapp_bot').length,
  };

  const container = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const item = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0  },
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="visible">

      {/* ── Header ── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {appointments.length > 0
              ? `${stats.scheduled} upcoming · ${stats.completed} completed · ${stats.fromBot} via bot`
              : 'Schedule and manage your appointments'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="icon"
            onClick={fetchAppointments} disabled={isLoading} title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>

          <Dialog
            open={isCreateOpen}
            onOpenChange={open => { setIsCreateOpen(open); if (!open) setForm(EMPTY_FORM); }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Book New Appointment</DialogTitle>
              </DialogHeader>

              {leadsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading contacts…
                </div>
              ) : (
                <FormFields form={form} leads={apiLeads} onChange={patchForm} />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setIsCreateOpen(false); setForm(EMPTY_FORM); }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleCreate}
                  disabled={isSubmitting || leadsLoading}
                >
                  {isSubmitting
                    ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Booking…</>
                    : <><Plus className="w-4 h-4 mr-2" /> Book Appointment</>
                  }
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',      value: stats.total,     cls: 'bg-muted'                              },
          { label: 'Scheduled',  value: stats.scheduled, cls: 'bg-blue-100 dark:bg-blue-900/20'       },
          { label: 'Completed',  value: stats.completed, cls: 'bg-green-100 dark:bg-green-900/20'     },
          { label: 'Cancelled',  value: stats.cancelled, cls: 'bg-red-100 dark:bg-red-900/20'         },
          { label: 'Via Bot 🤖', value: stats.fromBot,   cls: 'bg-emerald-100 dark:bg-emerald-900/20' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4', s.cls)}>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Tabs ── */}
      <Tabs value={view} onValueChange={v => setView(v as 'list' | 'calendar')}>
        <motion.div variants={item}>
          <TabsList className="bg-muted">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ── List view ── */}
        <TabsContent value="list" className="mt-4">
          <motion.div variants={item} className="bg-card rounded-xl border border-border overflow-hidden">
            {sorted.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 opacity-25" />
                <p className="text-sm">No appointments yet</p>
                <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Book one
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Date &amp; Time</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <SkeletonRows />
                    ) : (
                      sorted.map(apt => {
                        const cfg = STATUS_CONFIG[apt.status];

                        // Safe date formatting — avoids UTC timezone shift from new Date("YYYY-MM-DD")
                        const displayDate = (() => {
                          const [y, mo, d] = apt.date.slice(0, 10).split('-');
                          return new Date(Number(y), Number(mo) - 1, Number(d))
                            .toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            });
                        })();

                        // Display name falls back to phone number; avatar initial handles digit
                        const displayName = apt.lead_name || apt.lead_phone || 'Unknown';
                        const avatarChar  = displayName.charAt(0).toUpperCase();

                        return (
                          <tr key={apt.id} className="group">

                            {/* Contact */}
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                                  {avatarChar}
                                </div>
                                <div>
                                  {/* Primary line: name if available, else phone */}
                                  <p className="font-medium text-foreground text-sm leading-tight">
                                    {displayName}
                                  </p>
                                  {/* Secondary line: phone only when name is shown above */}
                                  {apt.lead_name && apt.lead_phone && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3" />
                                      {apt.lead_phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td>
                              <div className="flex items-center gap-1 text-sm text-foreground flex-wrap">
                                <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                {displayDate}
                                <Clock className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
                                {apt.time}
                              </div>
                            </td>

                            {/* Type */}
                            <td>
                              <div className="flex items-center gap-1.5 text-sm text-foreground">
                                <Bookmark className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                {apt.type || '—'}
                              </div>
                            </td>

                            {/* Source */}
                            <td><BookedViaBadge via={apt.booked_via} /></td>

                            {/* Status */}
                            <td>
                              <span className={cn('text-xs font-medium rounded-full px-2.5 py-1', cfg.className)}>
                                {cfg.label}
                              </span>
                            </td>

                            {/* Actions — scheduled only */}
                            <td>
                              {apt.status === 'scheduled' && (
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
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(apt.id, 'completed')}
                                    >
                                      <Check className="w-4 h-4 mr-2 text-green-600" /> Mark Complete
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                    >
                                      <X className="w-4 h-4 mr-2" /> Cancel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ── Calendar view ── */}
        <TabsContent value="calendar" className="mt-4">
          <motion.div variants={item} className="bg-card rounded-xl border border-border p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-muted p-3 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((day, i) => {
                const dayAppts = day ? getAppointmentsForDay(day) : [];
                return (
                  <div key={i} className={cn('bg-card min-h-[90px] p-2', !day && 'bg-muted/20')}>
                    {day && (
                      <>
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm',
                          isToday(day)
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-foreground',
                        )}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayAppts.slice(0, 2).map(apt => {
                            // Same fallback logic as list view
                            const calLabel = apt.lead_name ?? apt.lead_phone ?? 'Unknown';
                            return (
                              <div
                                key={apt.id}
                                title={`${apt.time} · ${calLabel} · ${apt.type}`}
                                className={cn(
                                  'text-xs p-1 rounded truncate leading-tight',
                                  apt.status === 'scheduled' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                                  apt.status === 'completed' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                                  apt.status === 'cancelled' && 'bg-red-100 text-red-700 line-through opacity-50 dark:bg-red-900/20',
                                )}
                              >
                                {apt.time} · {calLabel}
                              </div>
                            );
                          })}
                          {dayAppts.length > 2 && (
                            <p className="text-xs text-muted-foreground pl-1">
                              +{dayAppts.length - 2} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Appointments;