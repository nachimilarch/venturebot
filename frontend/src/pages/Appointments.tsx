// pages/Appointments.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Plus, Calendar as CalendarIcon, Clock, User, Phone,
  MoreHorizontal, Check, X, ChevronLeft, ChevronRight,
  Stethoscope, Bot, RefreshCw, AlertCircle
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_phone?: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  booked_via?: string;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
}

// ─── Appointment type config ──────────────────────────────────────────────────

const APPT_TYPES = [
  { value: 'General Consultation', label: 'General Consultation' },
  { value: 'Follow-up Visit',      label: 'Follow-up Visit'      },
  { value: 'Specialist Referral',  label: 'Specialist Referral'  },
  { value: 'Wellness Checkup',     label: 'Wellness Checkup'     },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Appointments: React.FC = () => {
  const { leads } = useTenant();

  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [view, setView]                   = useState<'calendar' | 'list'>('list');
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);

  // Form state
  const [form, setForm] = useState({
    lead_id: '',
    date:    '',
    time:    '',
    type:    '',
    notes:   '',
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/appointments');
      const data = res.data?.data || res.data || [];
      setAppointments(data);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.lead_id || !form.date || !form.time || !form.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post('/api/appointments', form);
      toast.success('Appointment booked successfully');
      setIsCreateOpen(false);
      setForm({ lead_id: '', date: '', time: '', type: '', notes: '' });
      await fetchAppointments();
    } catch (err) {
      toast.error('Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      await axios.patch(`/api/appointments/${id}`, { status });
      toast.success(`Appointment marked as ${status}`);
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status } : a)
      );
    } catch (err) {
      toast.error('Failed to update appointment');
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':  return 'bg-blue-100 text-blue-800';
      case 'completed':  return 'bg-green-100 text-green-800';
      case 'cancelled':  return 'bg-red-100 text-red-800';
      default:           return 'bg-muted text-muted-foreground';
    }
  };

  const getBookedViaIcon = (via?: string) => {
    if (via === 'whatsapp_bot') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
          <Bot className="w-3 h-3" /> WhatsApp Bot
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
        <User className="w-3 h-3" /> Manual
      </span>
    );
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDay  = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= lastDay; i++) days.push(i);
    return days;
  };

  const getAppointmentsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dateStr);
  };

  const isToday = (day: number) => {
    const t = new Date();
    return day === t.getDate() &&
      currentDate.getMonth() === t.getMonth() &&
      currentDate.getFullYear() === t.getFullYear();
  };

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  const upcomingAppointments = [...appointments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const stats = {
    total:     appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    fromBot:   appointments.filter(a => a.booked_via === 'whatsapp_bot').length,
  };

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Manage patient consultations and visits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchAppointments} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>Book New Appointment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Patient <span className="text-destructive">*</span></Label>
                  <Select value={form.lead_id} onValueChange={v => setForm(p => ({ ...p, lead_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {(leads as Lead[]).map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} · {lead.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time <span className="text-destructive">*</span></Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Consultation Type <span className="text-destructive">*</span></Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
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

                <div className="space-y-2">
                  <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input
                    placeholder="Any additional notes..."
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isSubmitting}>
                    {isSubmitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Book Appointment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',      value: stats.total,     color: 'bg-muted'         },
          { label: 'Scheduled',  value: stats.scheduled, color: 'bg-blue-100'      },
          { label: 'Completed',  value: stats.completed, color: 'bg-green-100'     },
          { label: 'Cancelled',  value: stats.cancelled, color: 'bg-red-100'       },
          { label: 'Via Bot 🤖', value: stats.fromBot,   color: 'bg-emerald-100'   },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4', s.color)}>
            <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <Tabs value={view} onValueChange={v => setView(v as 'calendar' | 'list')}>
        <motion.div variants={itemVariants}>
          <TabsList className="bg-muted">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ── List View ── */}
        <TabsContent value="list" className="mt-4">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" /> Loading appointments...
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 opacity-30" />
                <p className="text-sm">No appointments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingAppointments.map(apt => (
                      <tr key={apt.id} className="group">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 text-sm flex-shrink-0">
                              {(apt.lead_name || 'W').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {apt.lead_name || 'WhatsApp User'}
                              </p>
                              {apt.lead_phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {apt.lead_phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {new Date(apt.date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                            <Clock className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                            {apt.time}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                            {apt.type || '—'}
                          </div>
                        </td>
                        <td>
                          {getBookedViaIcon(apt.booked_via)}
                        </td>
                        <td>
                          <span className={cn(
                            'text-xs font-medium rounded-full px-2.5 py-1 capitalize',
                            getStatusColor(apt.status)
                          )}>
                            {apt.status}
                          </span>
                        </td>
                        <td>
                          {apt.status === 'scheduled' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStatusChange(apt.id, 'completed')}>
                                  <Check className="w-4 h-4 mr-2 text-green-600" />
                                  Mark Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ── Calendar View ── */}
        <TabsContent value="calendar" className="mt-4">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
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

            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-muted p-3 text-center text-sm font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((day, index) => {
                const dayAppts = day ? getAppointmentsForDay(day) : [];
                return (
                  <div
                    key={index}
                    className={cn('bg-card min-h-[100px] p-2', !day && 'bg-muted/30')}
                  >
                    {day && (
                      <>
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm',
                          isToday(day) && 'bg-primary text-primary-foreground font-medium'
                        )}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayAppts.slice(0, 2).map(apt => (
                            <div
                              key={apt.id}
                              className={cn(
                                'text-xs p-1.5 rounded truncate',
                                apt.status === 'scheduled' && 'bg-blue-100 text-blue-800',
                                apt.status === 'completed' && 'bg-green-100 text-green-800',
                                apt.status === 'cancelled' && 'bg-red-100 text-red-800 line-through',
                              )}
                            >
                              {apt.time} · {apt.lead_name || 'Patient'}
                            </div>
                          ))}
                          {dayAppts.length > 2 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              +{dayAppts.length - 2} more
                            </div>
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
