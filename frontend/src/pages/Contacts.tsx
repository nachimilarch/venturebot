// pages/Contacts.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Upload, Download, Edit, Trash2,
  Phone, Mail, Tag, MessageSquare, Ban, RefreshCw,
  ChevronLeft, ChevronRight, X, Check, Sparkles, Loader2,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge }  from '@/components/ui/badge';
import { cn }     from '@/lib/utils';
import api        from '@/lib/api';
import { toast }  from 'sonner';


// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id:              number;
  name:            string | null;
  phone:           string;
  email:           string | null;
  tags:            string[] | null;
  opt_out:         number;
  opt_out_at:      string | null;
  notes:           string | null;
  last_message_at: string | null;
  created_at:      string;
}

interface FormState {
  name:  string;
  phone: string;
  email: string;
  tags:  string;
  notes: string;
}

const EMPTY_FORM: FormState = { name: '', phone: '', email: '', tags: '', notes: '' };
const PAGE_SIZE = 50;


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function Contacts() {
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [offset, setOffset]       = useState(0);
  const [search, setSearch]       = useState('');
  const [filterOpt, setFilterOpt] = useState<'all' | 'active' | 'opted-out'>('all');

  const [showCreate, setShowCreate]   = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const [showThread, setShowThread]   = useState<Contact | null>(null);
  const [thread, setThread]           = useState<any[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [aiSummaryContact, setAiSummaryContact] = useState<Contact | null>(null);
  const [aiSummaryText, setAiSummaryText]       = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchContacts = useCallback(async (off = 0, q = search, opt = filterOpt) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE), offset: String(off),
      };
      if (q)             params.search   = q;
      if (opt === 'active')     params.opt_out = '0';
      if (opt === 'opted-out')  params.opt_out = '1';

      const { data } = await api.get('/api/contacts', { params });
      setContacts(data.data);
      setTotal(data.total);
      setOffset(off);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, filterOpt]);

  useEffect(() => { fetchContacts(0, search, filterOpt); }, [filterOpt]);

  // Debounced search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchContacts(0, v, filterOpt), 350);
  };

  // ── AI Summary ───────────────────────────────────────────────────────────────
  const openAiSummary = async (c: Contact) => {
    setAiSummaryContact(c);
    setAiSummaryText('');
    setAiSummaryLoading(true);
    try {
      const { data } = await api.post('/api/ai/contact-summary', { contactId: c.id });
      setAiSummaryText(data.summary || '');
    } catch (err: any) {
      if (err.response?.data?.code === 'NO_AI_TOKENS') {
        toast.error('AI token balance empty', { description: 'Top up in Billing → AI Tokens', action: { label: 'Billing', onClick: () => { window.location.href = '/billing'; } } });
      } else {
        toast.error(err.response?.data?.error || 'AI unavailable');
      }
      setAiSummaryContact(null);
    } finally { setAiSummaryLoading(false); }
  };

  // ── Thread ────────────────────────────────────────────────────────────────────
  const openThread = async (c: Contact) => {
    setShowThread(c);
    setThreadLoading(true);
    try {
      const { data } = await api.get(`/api/contacts/${c.id}/thread`, { params: { limit: 50 } });
      setThread(data.data);
    } catch { setThread([]); }
    finally { setThreadLoading(false); }
  };

  // ── Save (create / update) ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.phone.trim()) return toast.error('Phone is required');
    setSaving(true);
    try {
      const body = {
        name:  form.name  || undefined,
        phone: form.phone,
        email: form.email || undefined,
        tags:  form.tags  ? parseTags(form.tags) : undefined,
        notes: form.notes || undefined,
      };

      if (editContact) {
        await api.patch(`/api/contacts/${editContact.id}`, body);
        toast.success('Contact updated');
      } else {
        await api.post('/api/contacts', body);
        toast.success('Contact created');
      }

      setShowCreate(false);
      setEditContact(null);
      setForm(EMPTY_FORM);
      fetchContacts(offset);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete ${c.name || c.phone}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/contacts/${c.id}`);
      toast.success('Contact deleted');
      fetchContacts(offset);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  // ── Opt-out toggle ────────────────────────────────────────────────────────────
  const toggleOptOut = async (c: Contact) => {
    const next = c.opt_out ? 0 : 1;
    try {
      await api.patch(`/api/contacts/${c.id}`, { opt_out: next });
      toast.success(next ? 'Contact opted out' : 'Opt-out removed');
      fetchContacts(offset);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  // ── CSV import ────────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/api/contacts/import', fd);
      toast.success(`Imported ${data.inserted} contacts (${data.skipped} skipped)`);
      fetchContacts(0);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── CSV template download ────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csv = 'name,phone,email,tags,notes\nJohn Doe,9876543210,john@example.com,"vip,customer",Optional notes';
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a    = document.createElement('a');
    a.href = url; a.download = 'contacts_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-1.5" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => { setEditContact(null); setForm(EMPTY_FORM); setShowCreate(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Contact
          </Button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, or email…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'opted-out'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterOpt(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                filterOpt === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Opted out'}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchContacts(offset)} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last message</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && contacts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No contacts found</td></tr>
              ) : contacts.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {(c.name || c.phone).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[140px]">{c.name || <span className="text-muted-foreground italic">No name</span>}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">{c.email || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags?.slice(0, 3).map(t => (
                        <Badge key={t} variant="secondary" className="text-xs py-0">{t}</Badge>
                      ))}
                      {(c.tags?.length ?? 0) > 3 && <Badge variant="outline" className="text-xs py-0">+{c.tags!.length - 3}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{fmtDate(c.last_message_at)}</td>
                  <td className="px-4 py-3">
                    {c.opt_out ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                        <Ban className="w-3 h-3" /> Opted out
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <span className="sr-only">Actions</span>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openThread(c)}>
                          <MessageSquare className="w-4 h-4 mr-2" /> View messages
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAiSummary(c)}>
                          <Sparkles className="w-4 h-4 mr-2 text-purple-500" /> AI Summary
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditContact(c); setForm({ name: c.name||'', phone: c.phone, email: c.email||'', tags: (c.tags||[]).join(', '), notes: c.notes||'' }); setShowCreate(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleOptOut(c)}>
                          <Ban className="w-4 h-4 mr-2" /> {c.opt_out ? 'Remove opt-out' : 'Mark opted out'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(c)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm text-muted-foreground">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => fetchContacts(offset - PAGE_SIZE)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => fetchContacts(offset + PAGE_SIZE)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) { setEditContact(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <Label>Phone <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" disabled={!!editContact} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" type="email" />
            </div>
            <div>
              <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="vip, customer, lead" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes…" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editContact ? 'Save changes' : 'Add contact'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI Summary dialog ───────────────────────────────────────────── */}
      <Dialog open={!!aiSummaryContact} onOpenChange={v => { if (!v) setAiSummaryContact(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Summary — {aiSummaryContact?.name || aiSummaryContact?.phone}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 min-h-[80px]">
            {aiSummaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Analysing conversation…
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground">{aiSummaryText}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Message thread drawer ────────────────────────────────────────── */}
      <Dialog open={!!showThread} onOpenChange={v => { if (!v) setShowThread(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              {showThread?.name || showThread?.phone}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
            {threadLoading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Loading…</p>
            ) : thread.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No messages yet</p>
            ) : thread.map(m => (
              <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[80%] px-3 py-2 rounded-xl text-sm',
                  m.direction === 'outbound'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}>
                  <p>{m.message}</p>
                  <p className={cn('text-xs mt-1 opacity-70', m.direction === 'outbound' ? 'text-right' : '')}>
                    {fmtDate(m.sent_at || m.received_at)} · {m.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
