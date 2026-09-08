// pages/Drip.tsx — drip sequence management
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Edit, Play, Pause, Users,
  ChevronRight, ArrowDown, Clock, RefreshCw,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch }   from '@/components/ui/switch';
import { Badge }    from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn }  from '@/lib/utils';
import api     from '@/lib/api';
import { toast } from 'sonner';

interface Step {
  template_name: string;
  language:      string;
  delay_hours:   number;
}

interface Sequence {
  id:                  number;
  name:                string;
  description:         string | null;
  is_active:           number;
  step_count:          number;
  active_enrollments:  number;
  created_at:          string;
}

const EMPTY_STEP: Step = { template_name: '', language: 'en', delay_hours: 24 };

export default function Drip() {
  const [sequences, setSequences]     = useState<Sequence[]>([]);
  const [loading, setLoading]         = useState(false);

  const [showForm, setShowForm]       = useState(false);
  const [editSeq, setEditSeq]         = useState<Sequence | null>(null);
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps]             = useState<Step[]>([{ ...EMPTY_STEP }]);
  const [saving, setSaving]           = useState(false);

  const [enrollSeq, setEnrollSeq]     = useState<Sequence | null>(null);
  const [enrollPhones, setEnrollPhones] = useState('');
  const [enrolling, setEnrolling]     = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/drip');
      setSequences(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load sequences');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditSeq(null);
    setName(''); setDescription('');
    setSteps([{ ...EMPTY_STEP }]);
    setShowForm(true);
  };

  const openEdit = async (seq: Sequence) => {
    try {
      const { data } = await api.get(`/api/drip/${seq.id}`);
      setEditSeq(seq);
      setName(data.data.name);
      setDescription(data.data.description || '');
      setSteps(data.data.steps.length > 0 ? data.data.steps : [{ ...EMPTY_STEP }]);
      setShowForm(true);
    } catch { toast.error('Failed to load sequence'); }
  };

  const addStep = () => setSteps(s => [...s, { ...EMPTY_STEP }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof Step, val: string | number) =>
    setSteps(s => s.map((step, idx) => idx === i ? { ...step, [field]: val } : step));

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (steps.some(s => !s.template_name.trim())) return toast.error('All steps need a template name');
    setSaving(true);
    try {
      if (editSeq) {
        await api.put(`/api/drip/${editSeq.id}`, { name, description, steps });
        toast.success('Sequence updated');
      } else {
        await api.post('/api/drip', { name, description, steps });
        toast.success('Sequence created');
      }
      setShowForm(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (seq: Sequence) => {
    try {
      await api.put(`/api/drip/${seq.id}`, { is_active: !seq.is_active });
      toast.success(seq.is_active ? 'Sequence paused' : 'Sequence activated');
      fetch();
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (seq: Sequence) => {
    if (!confirm(`Delete "${seq.name}"? All enrollments will be removed.`)) return;
    try {
      await api.delete(`/api/drip/${seq.id}`);
      toast.success('Deleted');
      fetch();
    } catch { toast.error('Delete failed'); }
  };

  const handleEnroll = async () => {
    if (!enrollSeq) return;
    const phones = enrollPhones.split(/[\n,]/).map(p => p.trim().replace(/[^0-9]/g, '')).filter(Boolean);
    if (phones.length === 0) return toast.error('Enter at least one phone number');
    setEnrolling(true);
    try {
      const { data } = await api.post(`/api/drip/${enrollSeq.id}/enroll`, { phones });
      toast.success(`Enrolled ${data.enrolled} contacts`);
      setEnrollSeq(null);
      setEnrollPhones('');
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enroll failed');
    } finally { setEnrolling(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drip Sequences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automated multi-step WhatsApp campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> New Sequence
          </Button>
        </div>
      </div>

      {sequences.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium">No drip sequences yet</p>
          <p className="text-sm mt-1">Create a sequence to automate follow-up messages</p>
          <Button className="mt-4" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" /> Create first sequence</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sequences.map((seq, i) => (
            <motion.div key={seq.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{seq.name}</div>
                  {seq.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{seq.description}</p>}
                </div>
                <Switch checked={!!seq.is_active} onCheckedChange={() => toggleActive(seq)} />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" /> {seq.step_count} steps</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {seq.active_enrollments} active</span>
              </div>

              {!seq.is_active && <Badge variant="secondary" className="text-xs">Paused</Badge>}

              <div className="flex gap-2 pt-1 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(seq)}>
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEnrollSeq(seq); setEnrollPhones(''); }}>
                  <Users className="w-3.5 h-3.5 mr-1" /> Enroll
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(seq)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSeq ? 'Edit Sequence' : 'New Drip Sequence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Series" />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What does this sequence do?" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-3.5 h-3.5 mr-1" /> Add step</Button>
              </div>

              {steps.map((step, i) => (
                <div key={i} className="space-y-2">
                  {i > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2">
                      <ArrowDown className="w-3 h-3" />
                      <Clock className="w-3 h-3" />
                      Wait {step.delay_hours}h after previous step
                    </div>
                  )}
                  <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                      {steps.length > 1 && (
                        <button onClick={() => removeStep(i)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Template name</Label>
                        <Input value={step.template_name} onChange={e => updateStep(i, 'template_name', e.target.value)}
                          placeholder="my_template" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Delay (hours)</Label>
                        <Input type="number" min={1} value={step.delay_hours}
                          onChange={e => updateStep(i, 'delay_hours', parseInt(e.target.value) || 24)}
                          className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editSeq ? 'Save changes' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll dialog */}
      <Dialog open={!!enrollSeq} onOpenChange={v => { if (!v) setEnrollSeq(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enroll contacts — {enrollSeq?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Label>Phone numbers <span className="text-muted-foreground text-xs">(one per line or comma-separated)</span></Label>
            <Textarea value={enrollPhones} onChange={e => setEnrollPhones(e.target.value)}
              rows={5} placeholder="9876543210&#10;9123456789" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEnrollSeq(null)}>Cancel</Button>
              <Button onClick={handleEnroll} disabled={enrolling}>{enrolling ? 'Enrolling…' : 'Enroll'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
