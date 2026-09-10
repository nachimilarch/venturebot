import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, RefreshCw, Send, ChevronDown, CheckCircle,
  Clock, XCircle, AlertCircle, Search, X, FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const API = (path: string, opts?: RequestInit) =>
  fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  }).then(r => r.json());

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{ type: string; text: string }>;
}

interface Template {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  category: string;
  language: string;
  components: TemplateComponent[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  APPROVED:  { label: 'Approved',  icon: CheckCircle,  classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PENDING:   { label: 'Pending',   icon: Clock,        classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  REJECTED:  { label: 'Rejected',  icon: XCircle,      classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  PAUSED:    { label: 'Paused',    icon: AlertCircle,  classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
};

function getBodyText(components: TemplateComponent[]): string {
  return components.find(c => c.type === 'BODY')?.text || '';
}

function countVariables(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  return m ? new Set(m).size : 0;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['PAUSED'];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.classes)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    MARKETING:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    UTILITY:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    AUTHENTICATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', colors[category] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
      {category}
    </span>
  );
}

// ─── Send Modal ───────────────────────────────────────────────────────────────
function SendModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const body = getBodyText(template.components);
  const varCount = countVariables(body);
  const [phone, setPhone] = useState('');
  const [vars, setVars] = useState<string[]>(Array(varCount).fill(''));
  const [sending, setSending] = useState(false);

  const previewBody = vars.reduce(
    (acc, v, i) => acc.replaceAll(`{{${i + 1}}}`, v || `{{${i + 1}}}`),
    body
  );

  async function handleSend() {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) { toast({ title: 'Enter a valid phone number', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const res = await API(`/templates/${template.name}/send`, {
        method: 'POST',
        body: JSON.stringify({ to: cleaned, language: template.language, variables: vars }),
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: 'Template sent successfully' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Template</p>
            <p className="text-sm font-semibold">{template.name}</p>
          </div>

          <div>
            <Label>Recipient phone number</Label>
            <Input
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>

          {varCount > 0 && (
            <div className="space-y-2">
              <Label>Variables</Label>
              {Array.from({ length: varCount }, (_, i) => (
                <Input
                  key={i}
                  placeholder={`Variable {{${i + 1}}}`}
                  value={vars[i]}
                  onChange={e => setVars(v => { const n = [...v]; n[i] = e.target.value; return n; })}
                />
              ))}
            </div>
          )}

          {body && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
              <p className="whitespace-pre-wrap">{previewBody}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName]         = useState('');
  const [category, setCategory] = useState('UTILITY');
  const [language, setLanguage] = useState('en');
  const [header, setHeader]     = useState('');
  const [body, setBody]         = useState('');
  const [footer, setFooter]     = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !body.trim()) {
      toast({ title: 'Name and body are required', variant: 'destructive' });
      return;
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const components: TemplateComponent[] = [];
    if (header.trim()) components.push({ type: 'HEADER', format: 'TEXT', text: header.trim() });
    components.push({ type: 'BODY', text: body.trim() });
    if (footer.trim()) components.push({ type: 'FOOTER', text: footer.trim() });

    setCreating(true);
    try {
      const res = await API('/templates', {
        method: 'POST',
        body: JSON.stringify({ name: slug, category, language, components }),
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: 'Template submitted for Meta review', description: res.data?.note });
      onCreated();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to create template', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Template name</Label>
              <Input
                placeholder="order_confirmation"
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_ ]/g, ''))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Lowercase, underscores only</p>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="en_US">English US (en_US)</SelectItem>
                  <SelectItem value="hi">Hindi (hi)</SelectItem>
                  <SelectItem value="mr">Marathi (mr)</SelectItem>
                  <SelectItem value="gu">Gujarati (gu)</SelectItem>
                  <SelectItem value="ta">Tamil (ta)</SelectItem>
                  <SelectItem value="te">Telugu (te)</SelectItem>
                  <SelectItem value="kn">Kannada (kn)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKETING">Marketing — Promotions & offers</SelectItem>
                <SelectItem value="UTILITY">Utility — Transactional updates</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentication — OTP / verification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Header <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="Optional header text" value={header} onChange={e => setHeader(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Body <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder={"Hi {{1}}, your appointment on {{2}} is confirmed."}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className="mt-1 resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">{'{{1}}'}</code>, <code className="bg-muted px-1 rounded">{'{{2}}'}</code>… for variables
            </p>
          </div>

          <div>
            <Label>Footer <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Reply STOP to opt out" value={footer} onChange={e => setFooter(e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Submitting…' : 'Submit for Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ t, onSend }: { t: Template; onSend: () => void }) {
  const body = getBodyText(t.components);
  const header = t.components.find(c => c.type === 'HEADER')?.text;
  const footer = t.components.find(c => c.type === 'FOOTER')?.text;
  const buttons = t.components.find(c => c.type === 'BUTTONS')?.buttons || [];

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{t.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.language.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CategoryBadge category={t.category} />
          <StatusBadge status={t.status} />
        </div>
      </div>

      <div className="flex-1 rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm min-h-[60px]">
        {header && <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">{header}</p>}
        {body ? (
          <p className="whitespace-pre-wrap line-clamp-4">{body}</p>
        ) : (
          <p className="text-muted-foreground italic text-xs">No body text</p>
        )}
        {footer && <p className="text-xs text-muted-foreground border-t pt-1.5 mt-1">{footer}</p>}
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t mt-1">
            {buttons.map((b, i) => (
              <span key={i} className="rounded border px-2 py-0.5 text-xs text-muted-foreground">{b.text}</span>
            ))}
          </div>
        )}
      </div>

      {t.status === 'APPROVED' && (
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={onSend}>
          <Send className="h-3.5 w-3.5" />
          Send Template
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FILTER_TABS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function Templates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterTab>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [sendTarget, setSendTarget] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API('/templates');
      if (!res.success) throw new Error(res.error);
      setTemplates(res.data || []);
    } catch (e: any) {
      toast({ title: 'Failed to load templates', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = templates.filter(t => {
    const matchFilter = filter === 'ALL' || t.status === filter;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts: Record<string, number> = {
    ALL:      templates.length,
    APPROVED: templates.filter(t => t.status === 'APPROVED').length,
    PENDING:  templates.filter(t => t.status === 'PENDING').length,
    REJECTED: templates.filter(t => t.status === 'REJECTED').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b bg-background flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage WhatsApp message templates — list, create and send Meta-approved templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTemplates()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pt-4 pb-3 border-b bg-background flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === tab
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span className="ml-1.5 text-xs text-muted-foreground">({counts[tab]})</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 h-40 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">
              {search ? 'No templates match your search' : filter !== 'ALL' ? `No ${filter.toLowerCase()} templates` : 'No templates yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'ALL' && !search && 'Create your first template to get started'}
            </p>
            {filter === 'ALL' && !search && (
              <Button className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <TemplateCard key={t.id} t={t} onSend={() => setSendTarget(t)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={() => fetchTemplates(true)} />
      )}
      {sendTarget && (
        <SendModal template={sendTarget} onClose={() => setSendTarget(null)} />
      )}
    </div>
  );
}
