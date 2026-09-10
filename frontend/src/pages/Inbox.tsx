// pages/Inbox.tsx — two-panel WhatsApp inbox
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, RefreshCw, Phone, ArrowLeft,
  Ban, Check, CheckCheck, Circle, Sparkles, Loader2,
  Paperclip, FileText, Image as ImageIcon, X,
} from 'lucide-react';
import { Button }  from '@/components/ui/button';
import { Input }   from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge }   from '@/components/ui/badge';
import { cn }      from '@/lib/utils';
import api         from '@/lib/api';
import { toast }   from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  phone:          string;
  name:           string | null;
  opt_out:        number;
  last_at:        string | null;
  last_message:   string | null;
  last_direction: 'inbound' | 'outbound' | null;
  unread_count:   number;
}

interface Message {
  id:             number;
  message:        string;
  direction:      'inbound' | 'outbound';
  status:         string;
  is_read:        number;
  sent_at:        string | null;
  received_at:    string | null;
  delivered_at:   string | null;
  read_at:        string | null;
  media_id?:      string | null;
  media_type?:    string | null;
  media_caption?: string | null;
  media_filename?:string | null;
}

interface PendingMedia {
  file: File;
  media_id: string;
  mime_type: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function truncate(s: string | null, n = 45) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ─── Media bubble renderer ────────────────────────────────────────────────────
function MediaBubble({ msg }: { msg: Message }) {
  const isImage = msg.media_type?.startsWith('image/');
  if (isImage && msg.media_id) {
    return (
      <div className="space-y-1">
        <a href={`/api/inbox/media/${msg.media_id}`} target="_blank" rel="noopener noreferrer">
          <img
            src={`/api/inbox/media/${msg.media_id}`}
            alt={msg.media_caption || 'Image'}
            className="max-w-[220px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
        {msg.media_caption && <p className="text-xs mt-1 opacity-80">{msg.media_caption}</p>}
      </div>
    );
  }
  if (!isImage) {
    return (
      <a
        href={msg.media_id ? `/api/inbox/media/${msg.media_id}` : '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm underline underline-offset-2"
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span>{msg.media_filename || msg.media_caption || 'Document'}</span>
      </a>
    );
  }
  return <p className="whitespace-pre-wrap break-words">{msg.message}</p>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Inbox() {
  const [convos, setConvos]         = useState<Conversation[]>([]);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [active, setActive]         = useState<Conversation | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [reply, setReply]           = useState('');
  const [sending, setSending]       = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading]   = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const bottomRef    = useRef<HTMLDivElement>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval>>();
  const searchTimer  = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch conversations ───────────────────────────────────────────────────
  const fetchConvos = useCallback(async (q = search) => {
    setLoadingList(true);
    try {
      const params: Record<string, string> = { limit: '60' };
      if (q) params.search = q;
      const { data } = await api.get('/api/inbox', { params });
      setConvos(data.data);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load inbox');
    } finally {
      setLoadingList(false);
    }
  }, [search]);

  // ── Fetch thread ──────────────────────────────────────────────────────────
  const fetchThread = useCallback(async (phone: string, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const { data } = await api.get(`/api/inbox/${phone}`, { params: { limit: 80 } });
      setMessages(data.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* silent */ }
    finally { setLoadingThread(false); }
  }, []);

  // ── Mark read when opening a convo ───────────────────────────────────────
  const openConvo = async (c: Conversation) => {
    setActive(c);
    setMobileView('chat');
    await fetchThread(c.phone);
    if (c.unread_count > 0) {
      api.patch(`/api/inbox/${c.phone}/read`).then(() => {
        setConvos(prev => prev.map(x => x.phone === c.phone ? { ...x, unread_count: 0 } : x));
      }).catch(() => {});
    }
  };

  // ── Send reply ────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/inbox/${active.phone}/reply`, { message: reply.trim() });
      setMessages(prev => [...prev, { ...data.data, id: data.data.id }]);
      setReply('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      // Update convo last message
      setConvos(prev => prev.map(c =>
        c.phone === active.phone
          ? { ...c, last_message: reply.trim(), last_direction: 'outbound', last_at: new Date().toISOString() }
          : c
      ));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // ── Pick & upload media ───────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    e.target.value = '';

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, WebP or PDF files are supported.');
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File must be under 16 MB.');
      return;
    }

    setUploadingMedia(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/api/inbox/upload-media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPendingMedia({ file, media_id: data.media_id, mime_type: data.mime_type });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  const sendMedia = async () => {
    if (!active || !pendingMedia) return;
    setSending(true);
    try {
      const isImage = pendingMedia.mime_type.startsWith('image/');
      const { data } = await api.post(`/api/inbox/${active.phone}/reply-media`, {
        type: isImage ? 'image' : 'document',
        media_id: pendingMedia.media_id,
        caption: reply.trim() || undefined,
        filename: !isImage ? pendingMedia.file.name : undefined,
      });
      setMessages(prev => [...prev, { ...data.data }]);
      setPendingMedia(null);
      setReply('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      setConvos(prev => prev.map(c =>
        c.phone === active.phone
          ? { ...c, last_message: data.data.message, last_direction: 'outbound', last_at: new Date().toISOString() }
          : c
      ));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // ── Poll for new messages ─────────────────────────────────────────────────
  useEffect(() => {
    fetchConvos();
    pollRef.current = setInterval(() => {
      fetchConvos(search);
      if (active) fetchThread(active.phone, true);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [active?.phone]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchConvos(search), 350);
  }, [search]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  const suggestReplies = async () => {
    if (!active) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const { data } = await api.post('/api/ai/suggest-reply', { phone: active.phone });
      setAiSuggestions(data.suggestions || []);
    } catch (err: any) {
      if (err.response?.data?.code === 'NO_AI_TOKENS') {
        toast.error('AI token balance empty', { description: 'Top up in Billing → AI Tokens', action: { label: 'Billing', onClick: () => { window.location.href = '/billing'; } } });
      } else {
        toast.error(err.response?.data?.error || 'AI unavailable');
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Conversation list ───────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-col border-r bg-background w-full md:w-[320px] lg:w-[360px] shrink-0',
        mobileView === 'chat' && 'hidden md:flex'
      )}>
        {/* Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Inbox</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{total} convos</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => fetchConvos()} disabled={loadingList}>
                <RefreshCw className={cn('w-3.5 h-3.5', loadingList && 'animate-spin')} />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {convos.length === 0 && !loadingList && (
            <p className="text-center text-muted-foreground text-sm py-12">No conversations yet</p>
          )}
          {convos.map(c => (
            <button
              key={c.phone}
              onClick={() => openConvo(c)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors',
                active?.phone === c.phone && 'bg-muted/60'
              )}
            >
              {/* Avatar */}
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm text-primary mt-0.5">
                {(c.name || c.phone).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm truncate">{c.name || c.phone}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.last_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className={cn(
                    'text-xs truncate',
                    c.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {c.last_direction === 'outbound' && <span className="text-muted-foreground mr-1">You:</span>}
                    {truncate(c.last_message)}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col bg-muted/10',
        mobileView === 'list' && 'hidden md:flex'
      )}>
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background">
              <button className="md:hidden" onClick={() => setMobileView('list')}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm text-primary">
                {(active.name || active.phone).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{active.name || active.phone}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" /> {active.phone}
                  {active.opt_out ? (
                    <span className="ml-2 text-red-500 flex items-center gap-0.5"><Ban className="w-3 h-3" /> opted out</span>
                  ) : (
                    <span className="ml-2 text-green-600 flex items-center gap-0.5"><Check className="w-3 h-3" /> active</span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingThread ? (
                <p className="text-center text-muted-foreground text-sm py-8">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No messages</p>
              ) : messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.3) }}
                  className={cn('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm',
                    m.direction === 'outbound'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-background border text-foreground rounded-bl-sm'
                  )}>
                    {m.media_id ? <MediaBubble msg={m} /> : <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                    <div className={cn(
                      'flex items-center gap-1 mt-1 text-[10px]',
                      m.direction === 'outbound' ? 'justify-end opacity-70' : 'text-muted-foreground'
                    )}>
                      <span>{fmtTime(m.sent_at || m.received_at)}</span>
                      {m.direction === 'outbound' && (
                        m.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-400" /> :
                        m.status === 'delivered' ? <CheckCheck className="w-3 h-3" /> :
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="px-4 py-3 border-t bg-background">
              {active.opt_out ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  <Ban className="w-4 h-4 shrink-0" />
                  This contact has opted out — cannot send messages.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* AI suggestion chips */}
                  <AnimatePresence>
                    {(aiSuggestions.length > 0 || aiLoading) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-1.5"
                      >
                        {aiLoading ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> AI is thinking…
                          </span>
                        ) : aiSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { setReply(s); setAiSuggestions([]); }}
                            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-3 py-1 transition-colors text-left"
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pending media preview */}
                  <AnimatePresence>
                    {pendingMedia && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm"
                      >
                        {pendingMedia.mime_type.startsWith('image/')
                          ? <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                          : <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        }
                        <span className="flex-1 truncate text-xs">{pendingMedia.file.name}</span>
                        <button onClick={() => setPendingMedia(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia}
                      title="Attach image or PDF"
                      className="h-10 px-2.5 text-muted-foreground"
                    >
                      {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </Button>
                    <Textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={pendingMedia ? 'Add a caption (optional)…' : 'Type a message… (Enter to send, Shift+Enter for newline)'}
                      rows={1}
                      className="resize-none flex-1 min-h-[40px] max-h-32 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={suggestReplies}
                      disabled={aiLoading || !!pendingMedia}
                      title="AI suggest replies"
                      className="h-10 px-3 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                    {pendingMedia ? (
                      <Button size="sm" onClick={sendMedia} disabled={sending} className="h-10 px-3">
                        {sending ? <Circle className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()} className="h-10 px-3">
                        {sending ? <Circle className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                Free-text replies only work within the 24-hour user-initiated window.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
