// pages/FlowBuilder.tsx — visual flow builder
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit, ArrowDown,
  ChevronLeft, MessageSquare, List, MousePointerClick,
  FileText, Tag, Save, RefreshCw, Zap, Sparkles, Loader2,
  MoreVertical, Pencil, GripVertical,
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
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn }    from '@/lib/utils';
import api       from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlowNode {
  id:           number;
  trigger:      string;
  message:      string;
  message_type: 'text' | 'buttons' | 'list' | 'template';
  buttons:      { id: string; title: string }[] | null;
  next_trigger: string | null;
}

interface Flow {
  id:         number;
  name:       string;
  is_active:  number;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:     <MessageSquare className="w-3.5 h-3.5" />,
  buttons:  <MousePointerClick className="w-3.5 h-3.5" />,
  list:     <List className="w-3.5 h-3.5" />,
  template: <FileText className="w-3.5 h-3.5" />,
};

const EMPTY_NODE = { trigger: '', message: '', message_type: 'text' as const, buttons: null, next_trigger: null };

// ─── Flow list view ───────────────────────────────────────────────────────────
export default function FlowBuilder() {
  const [flows, setFlows]       = useState<Flow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [newName, setNewName]   = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renameFlow, setRenameFlow] = useState<Flow | null>(null);
  const [renameName, setRenameName] = useState('');

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/flows');
      setFlows(data.data);
    } catch { toast.error('Failed to load flows'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFlows(); }, []);

  const createFlow = async () => {
    if (!newName.trim()) return toast.error('Name required');
    setCreating(true);
    try {
      const { data } = await api.post('/api/flows', { name: newName.trim() });
      toast.success('Flow created');
      setShowCreate(false); setNewName('');
      await fetchFlows();
      // Open the new flow
      setActiveFlow({ id: data.flowId, name: newName.trim(), is_active: 1, created_at: new Date().toISOString() });
    } catch { toast.error('Create failed'); }
    finally { setCreating(false); }
  };

  const toggleFlow = async (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/api/flows/${flow.id}/activate`);
      fetchFlows();
      toast.success(flow.is_active ? 'Flow paused' : 'Flow activated');
    } catch { toast.error('Update failed'); }
  };

  const deleteFlow = async (flow: Flow) => {
    if (!confirm(`Delete flow "${flow.name}"? All its nodes will be removed.`)) return;
    try {
      await api.delete(`/api/flows/${flow.id}`);
      toast.success('Flow deleted');
      fetchFlows();
    } catch { toast.error('Delete failed'); }
  };

  const saveRename = async () => {
    if (!renameFlow || !renameName.trim()) return;
    try {
      await api.put(`/api/flows/${renameFlow.id}`, { name: renameName.trim() });
      toast.success('Flow renamed');
      setRenameFlow(null);
      fetchFlows();
    } catch { toast.error('Rename failed'); }
  };

  if (activeFlow) {
    return (
      <FlowEditor
        flow={activeFlow}
        onBack={() => { setActiveFlow(null); fetchFlows(); }}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flow Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-reply bots triggered by inbound messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchFlows} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Flow
          </Button>
        </div>
      </div>

      {flows.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No flows yet</p>
          <p className="text-sm mt-1">Create a flow to auto-respond to inbound WhatsApp messages</p>
          <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create first flow
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flows.map((flow, i) => (
            <motion.div
              key={flow.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setActiveFlow(flow)}
              className="rounded-xl border bg-card p-4 cursor-pointer hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate flex-1">{flow.name}</span>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Switch
                    checked={!!flow.is_active}
                    onCheckedChange={() => {}}
                    onClick={e => toggleFlow(flow, e)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setRenameFlow(flow); setRenameName(flow.name); }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => deleteFlow(flow)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {flow.is_active
                  ? <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0">Active</Badge>
                  : <Badge variant="secondary" className="text-xs">Paused</Badge>
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(flow.created_at).toLocaleDateString('en-IN')}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Flow</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Flow name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Welcome Bot" onKeyDown={e => e.key === 'Enter' && createFlow()} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createFlow} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameFlow} onOpenChange={v => { if (!v) setRenameFlow(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Flow</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>New name</Label>
              <Input value={renameName} onChange={e => setRenameName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveRename()} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameFlow(null)}>Cancel</Button>
              <Button onClick={saveRename}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Flow editor ───────────────────────────────────────────────────────────────
function FlowEditor({ flow, onBack }: { flow: Flow; onBack: () => void }) {
  const [nodes, setNodes]     = useState<FlowNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [editNode, setEditNode]   = useState<FlowNode | null>(null);
  const [editForm, setEditForm]   = useState<Omit<FlowNode,'id'>>(EMPTY_NODE);
  const [editBtns, setEditBtns]   = useState<string>('');
  const [saving, setSaving]       = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState<Omit<FlowNode,'id'>>(EMPTY_NODE);
  const [addBtns, setAddBtns]     = useState('');

  // Drag-and-drop state
  const [dragIdx, setDragIdx]   = useState<number | null>(null);
  const [dropIdx, setDropIdx]   = useState<number | null>(null);
  const dragCounter = useRef(0);

  // AI Flow Builder state
  const [aiBuildOpen, setAiBuildOpen]   = useState(false);
  const [aiDesc, setAiDesc]             = useState('');
  const [aiBuilding, setAiBuilding]     = useState(false);
  const [aiPreview, setAiPreview]       = useState<Omit<FlowNode,'id'>[] | null>(null);
  const [aiCreating, setAiCreating]     = useState(false);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/flows/${flow.id}/nodes`);
      setNodes(data.data);
    } catch { toast.error('Failed to load nodes'); }
    finally { setLoading(false); }
  }, [flow.id]);

  // Drag-and-drop handlers
  const handleDragStart = (i: number) => {
    setDragIdx(i);
    dragCounter.current = 0;
  };
  const handleDragEnter = (i: number) => {
    dragCounter.current++;
    if (i !== dragIdx) setDropIdx(i);
  };
  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDropIdx(null);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { resetDrag(); return; }
    const reordered = [...nodes];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setNodes(reordered);
    api.patch(`/api/flows/${flow.id}/nodes/reorder`, {
      order: reordered.map((n, i) => ({ id: n.id, sort_order: (i + 1) * 10 })),
    }).catch(() => { toast.error('Reorder failed'); fetchNodes(); });
    resetDrag();
  };
  const resetDrag = () => { setDragIdx(null); setDropIdx(null); dragCounter.current = 0; };

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const parseButtons = (raw: string) =>
    raw.split('\n').map(line => line.trim()).filter(Boolean)
       .map((line, i) => ({ id: `btn_${i+1}`, title: line.slice(0,20) }));

  const saveNode = async () => {
    if (!editNode) return;
    if (!editForm.trigger.trim() || !editForm.message.trim()) return toast.error('Trigger and message required');
    setSaving(true);
    try {
      await api.put(`/api/flows/${flow.id}/nodes/${editNode.id}`, {
        ...editForm,
        buttons: editForm.message_type === 'buttons' && editBtns.trim()
          ? parseButtons(editBtns) : null,
      });
      toast.success('Node saved');
      setEditNode(null);
      fetchNodes();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const addNode = async () => {
    if (!addForm.trigger.trim() || !addForm.message.trim()) return toast.error('Trigger and message required');
    setSaving(true);
    try {
      await api.post(`/api/flows/${flow.id}/nodes`, {
        ...addForm,
        buttons: addForm.message_type === 'buttons' && addBtns.trim()
          ? parseButtons(addBtns) : null,
      });
      toast.success('Node added');
      setShowAdd(false);
      setAddForm(EMPTY_NODE);
      setAddBtns('');
      fetchNodes();
    } catch { toast.error('Add failed'); }
    finally { setSaving(false); }
  };

  const deleteNode = async (node: FlowNode) => {
    if (!confirm('Delete this node?')) return;
    try {
      await api.delete(`/api/flows/${flow.id}/nodes/${node.id}`);
      fetchNodes();
    } catch { toast.error('Delete failed'); }
  };

  const openEdit = (node: FlowNode) => {
    setEditNode(node);
    setEditForm({ trigger: node.trigger, message: node.message, message_type: node.message_type, buttons: node.buttons, next_trigger: node.next_trigger });
    setEditBtns(node.buttons ? node.buttons.map(b => b.title).join('\n') : '');
  };

  const buildWithAi = async () => {
    if (!aiDesc.trim()) return toast.error('Describe the flow first');
    setAiBuilding(true);
    setAiPreview(null);
    try {
      const { data } = await api.post('/api/ai/build-flow', { description: aiDesc });
      setAiPreview(data.nodes);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI unavailable');
    } finally {
      setAiBuilding(false);
    }
  };

  const createAiNodes = async () => {
    if (!aiPreview) return;
    setAiCreating(true);
    try {
      for (const node of aiPreview) {
        await api.post(`/api/flows/${flow.id}/nodes`, node);
      }
      toast.success(`${aiPreview.length} nodes created`);
      setAiBuildOpen(false);
      setAiDesc('');
      setAiPreview(null);
      fetchNodes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Create failed');
    } finally {
      setAiCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Flows
        </Button>
        <h1 className="text-xl font-bold flex-1 truncate">{flow.name}</h1>
        <Badge variant={flow.is_active ? 'default' : 'secondary'}>
          {flow.is_active ? 'Active' : 'Paused'}
        </Badge>
        <Button
          size="sm" variant="outline"
          onClick={() => { setAiBuildOpen(true); setAiPreview(null); setAiDesc(''); }}
          className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/30"
        >
          <Sparkles className="w-3.5 h-3.5" /> Build with AI
        </Button>
      </div>

      {/* How it works */}
      <div className="rounded-lg bg-muted/40 border p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">How flows work:</strong> When a contact sends a message matching a node's <em>trigger keyword</em>, Vaartabot sends that node's reply. Set <em>next trigger</em> to chain nodes together. <strong className="text-foreground">Drag</strong> the <GripVertical className="inline w-3 h-3 -mt-0.5" /> handle to reorder steps.
      </div>

      {/* Node list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
          No nodes yet — add the first step below
        </div>
      ) : (
        <div className="space-y-1">
          {nodes.map((node, i) => (
            <div key={node.id}>
              {/* Drop-zone indicator above */}
              {dropIdx === i && dragIdx !== null && dragIdx !== i && dragIdx !== i - 1 && (
                <div className="h-1 rounded-full bg-primary mx-2 mb-1 transition-all" />
              )}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(i)}
                onDragEnd={resetDrag}
                className={cn(
                  'rounded-xl border bg-card p-4 space-y-2 transition-all select-none',
                  dragIdx === i && 'opacity-40 scale-[0.98] shadow-none',
                  dropIdx === i && dragIdx !== i && 'ring-2 ring-primary',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Drag handle + meta */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 pt-0.5">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-mono px-2 py-0.5 rounded-full truncate">
                      <Tag className="w-3 h-3 shrink-0" /> {node.trigger}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      {TYPE_ICONS[node.message_type]} {node.message_type}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(node)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => deleteNode(node)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 pl-8">{node.message}</p>
                {node.buttons && node.buttons.length > 0 && (
                  <div className="flex gap-1 flex-wrap pl-8">
                    {node.buttons.map(b => (
                      <span key={b.id} className="border rounded-full text-xs px-2 py-0.5">{b.title}</span>
                    ))}
                  </div>
                )}
                {node.next_trigger && (
                  <p className="text-xs text-muted-foreground pl-8">
                    → awaits: <code className="text-primary">{node.next_trigger}</code>
                  </p>
                )}
              </motion.div>
              {i < nodes.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add node */}
      {showAdd ? (
        <NodeForm
          form={addForm} setForm={setAddForm}
          buttons={addBtns} setButtons={setAddBtns}
          onSave={addNode} onCancel={() => { setShowAdd(false); setAddForm(EMPTY_NODE); setAddBtns(''); }}
          saving={saving}
          title="Add node"
        />
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add node
        </Button>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editNode} onOpenChange={v => { if (!v) setEditNode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit node</DialogTitle></DialogHeader>
          <NodeForm
            form={editForm} setForm={setEditForm}
            buttons={editBtns} setButtons={setEditBtns}
            onSave={saveNode} onCancel={() => setEditNode(null)}
            saving={saving} title=""
          />
        </DialogContent>
      </Dialog>

      {/* AI Build dialog */}
      <Dialog open={aiBuildOpen} onOpenChange={v => { setAiBuildOpen(v); if (!v) setAiPreview(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> Build Flow with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Describe your bot flow</Label>
              <Textarea
                placeholder="e.g. Greet the customer, ask if they want to book an appointment or get information, if book then ask for preferred time, confirm and say team will call back"
                rows={4}
                value={aiDesc}
                onChange={e => setAiDesc(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Be specific — include the questions asked and options offered at each step.</p>
            </div>
            <Button
              onClick={buildWithAi}
              disabled={aiBuilding || !aiDesc.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {aiBuilding
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating nodes…</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Generate Flow</>
              }
            </Button>

            {aiPreview && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{aiPreview.length} nodes generated — preview:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {aiPreview.map((node, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-0.5 rounded-full">
                          {node.trigger}
                        </span>
                        <span className="text-xs text-muted-foreground">{node.message_type}</span>
                        {node.next_trigger && (
                          <span className="text-xs text-muted-foreground ml-auto">→ {node.next_trigger}</span>
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{node.message}</p>
                      {node.buttons && (
                        <div className="flex gap-1 flex-wrap">
                          {(node.buttons as {id:string;title:string}[]).map(b => (
                            <span key={b.id} className="border rounded-full text-xs px-2 py-0.5">{b.title}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAiPreview(null)} className="flex-1">
                    Regenerate
                  </Button>
                  <Button
                    size="sm"
                    onClick={createAiNodes}
                    disabled={aiCreating}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {aiCreating
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                      : `Create ${aiPreview.length} nodes`
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Node form ─────────────────────────────────────────────────────────────────
function NodeForm({
  form, setForm, buttons, setButtons,
  onSave, onCancel, saving, title,
}: {
  form: Omit<FlowNode,'id'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<FlowNode,'id'>>>;
  buttons: string;
  setButtons: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  return (
    <div className={cn('space-y-3', title && 'rounded-xl border bg-card p-4')}>
      {title && <p className="font-medium text-sm">{title}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Trigger keyword <span className="text-red-500">*</span></Label>
          <Input value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
            placeholder="e.g. hi, hello, start" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={form.message_type} onValueChange={v => setForm(f => ({ ...f, message_type: v as any }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="buttons">Buttons</SelectItem>
              <SelectItem value="template">Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">
          {form.message_type === 'template' ? 'Template name' : 'Message'} <span className="text-red-500">*</span>
        </Label>
        {form.message_type === 'template' ? (
          <Input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="approved_template_name" className="h-8 text-sm" />
        ) : (
          <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Message to send…" rows={3} className="text-sm" />
        )}
      </div>
      {form.message_type === 'buttons' && (
        <div>
          <Label className="text-xs">Button labels <span className="text-muted-foreground">(one per line, max 3)</span></Label>
          <Textarea value={buttons} onChange={e => setButtons(e.target.value)}
            placeholder="Yes&#10;No&#10;Learn more" rows={3} className="text-sm" />
        </div>
      )}
      <div>
        <Label className="text-xs">Next trigger <span className="text-muted-foreground">(optional — chains to another node)</span></Label>
        <Input value={form.next_trigger || ''} onChange={e => setForm(f => ({ ...f, next_trigger: e.target.value || null }))}
          placeholder="e.g. confirm" className="h-8 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : <><Save className="w-3.5 h-3.5 mr-1" /> Save</>}</Button>
      </div>
    </div>
  );
}
