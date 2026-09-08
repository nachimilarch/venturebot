// OnboardingWizard.tsx — step-by-step app guide for VaartaBot by Milarch Tech
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, ArrowRight, ArrowLeft, CheckCircle2, Circle,
  Settings, BookUser, Megaphone, GitBranch,
  Inbox, Workflow, Sparkles, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Step {
  id:       string;
  icon:     React.ReactNode;
  color:    string;     // hsl string for accent
  title:    string;
  subtitle: string;
  bullets:  string[];
  cta:      string;
  href:     string;
  checkKey: keyof Status;
}

interface Status {
  hasWhatsapp: boolean;
  hasContacts: boolean;
  hasCampaign: boolean;
}

const STEPS: Step[] = [
  {
    id: 'whatsapp', icon: <Settings className="w-5 h-5" />,
    color: '220 73% 55%',
    title: 'Connect WhatsApp',
    subtitle: 'Link your Meta Business account to start sending messages at scale.',
    bullets: [
      'Add your Meta Phone Number ID and API token',
      'Enable the webhook for incoming messages',
      'Test with a quick template send',
    ],
    cta: 'Open Settings', href: '/settings',
    checkKey: 'hasWhatsapp',
  },
  {
    id: 'contacts', icon: <BookUser className="w-5 h-5" />,
    color: '142 71% 42%',
    title: 'Build your audience',
    subtitle: 'Import contacts from a CSV or add them one at a time.',
    bullets: [
      'Bulk-import via CSV (name, phone, email, tags)',
      'Tag contacts for targeted campaigns',
      'Manage opt-outs automatically',
    ],
    cta: 'Go to Contacts', href: '/contacts',
    checkKey: 'hasContacts',
  },
  {
    id: 'campaign', icon: <Megaphone className="w-5 h-5" />,
    color: '38 92% 50%',
    title: 'Send your first campaign',
    subtitle: 'Broadcast approved WhatsApp templates to your audience in one click.',
    bullets: [
      'Link a Meta-approved template to your campaign',
      'Use AI to draft message copy automatically',
      'Track delivery and read rates in real time',
    ],
    cta: 'Create Campaign', href: '/campaigns',
    checkKey: 'hasCampaign',
  },
  {
    id: 'drip', icon: <GitBranch className="w-5 h-5" />,
    color: '262 83% 60%',
    title: 'Set up drip sequences',
    subtitle: 'Automate multi-step follow-up campaigns with scheduled messages.',
    bullets: [
      'Build a sequence of templates with timed delays',
      'Use AI to suggest the entire step sequence',
      'Enroll contacts and track active enrollments',
    ],
    cta: 'Build Drip', href: '/drip',
    checkKey: 'hasContacts', // proxy — any contacts means ready
  },
  {
    id: 'inbox', icon: <Inbox className="w-5 h-5" />,
    color: '197 71% 48%',
    title: 'Monitor your Inbox',
    subtitle: 'See incoming replies and respond from a unified conversation view.',
    bullets: [
      'All inbound WhatsApp messages in one place',
      'Reply manually or let AI suggest responses',
      'Enable the AI autoresponder for 24/7 coverage',
    ],
    cta: 'Open Inbox', href: '/inbox',
    checkKey: 'hasWhatsapp',
  },
  {
    id: 'flow', icon: <Workflow className="w-5 h-5" />,
    color: '340 82% 56%',
    title: 'Build automation flows',
    subtitle: 'Design keyword-triggered chatbot flows — or let AI build them for you.',
    bullets: [
      'Create trigger → message → button chains',
      'Use "Build with AI" to generate flows from a description',
      'Falls back to AI autoresponder when no flow matches',
    ],
    cta: 'Open Flow Builder', href: '/flow-builder',
    checkKey: 'hasWhatsapp',
  },
  {
    id: 'ai', icon: <Sparkles className="w-5 h-5" />,
    color: '262 83% 58%',
    title: 'Explore AI features',
    subtitle: 'Every page has AI-powered shortcuts — powered by local Ollama, no API cost.',
    bullets: [
      'Inbox: "Suggest replies" based on conversation',
      'Contacts: "AI Summary" of engagement and intent',
      'Campaigns: "AI Insights" on delivery metrics',
    ],
    cta: 'Try AI in Inbox', href: '/inbox',
    checkKey: 'hasContacts',
  },
];

interface OnboardingWizardProps {
  open:    boolean;
  onClose: () => void;
}

export default function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>({ hasWhatsapp: false, hasContacts: false, hasCampaign: false });

  useEffect(() => {
    if (!open) return;
    api.get('/api/onboarding/status').then(r => setStatus(r.data)).catch(() => {});
  }, [open]);

  const current = STEPS[step];
  const isDone  = (s: Step) => status[s.checkKey];
  const completed = STEPS.filter(isDone).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  {/* Milarch logomark */}
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="16" height="16" rx="3" fill="hsl(220 73% 49%)"/>
                    <path d="M3 12V4L6.5 9L8 6.5L9.5 9L13 4V12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Getting Started
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {completed}/{STEPS.length} done
                  </span>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress strip */}
              <div className="flex h-1">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex-1 transition-colors duration-500"
                       style={{ background: isDone(s) ? `hsl(${s.color})` : i === step ? `hsl(${current.color} / 0.4)` : 'hsl(var(--muted))' }} />
                ))}
              </div>

              {/* Step pills */}
              <div className="flex gap-1.5 px-5 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setStep(i)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border',
                      i === step
                        ? 'text-white border-transparent'
                        : isDone(s)
                          ? 'text-foreground bg-muted/50 border-border'
                          : 'text-muted-foreground bg-transparent border-transparent hover:bg-muted'
                    )}
                    style={i === step ? { background: `hsl(${s.color})`, borderColor: 'transparent' } : {}}
                  >
                    {isDone(s) ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>}
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                ))}
              </div>

              {/* Main step area */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-5"
                  >
                    {/* Icon + status */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white"
                           style={{ background: `hsl(${current.color})` }}>
                        {current.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em' }}>
                            {current.title}
                          </h2>
                          {isDone(current) && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-950/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{current.subtitle}</p>
                      </div>
                    </div>

                    {/* Bullets */}
                    <div className="mt-4 space-y-2">
                      {current.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: `hsl(${current.color})` }} />
                          <p className="text-sm text-foreground/80 leading-relaxed">{b}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-5">
                      <button
                        onClick={() => { navigate(current.href); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-98"
                        style={{ background: `hsl(${current.color})` }}
                      >
                        {current.cta}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                <button
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <div className="flex gap-1">
                  {STEPS.map((_, i) => (
                    <button key={i} onClick={() => setStep(i)}
                      className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                      style={{ background: i === step ? `hsl(${current.color})` : 'hsl(var(--muted-foreground) / 0.3)', transform: i === step ? 'scale(1.4)' : 'scale(1)' }} />
                  ))}
                </div>

                <button
                  onClick={() => step === STEPS.length - 1 ? onClose() : setStep(s => s + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ background: `hsl(${current.color})` }}
                >
                  {step === STEPS.length - 1 ? 'Finish' : 'Next'}
                  {step < STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Thin floating trigger (shown in bottom-right on first load) ──────────────
export function OnboardingTrigger({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus]   = useState<Status | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem('guide_dismissed') === '1';
    if (dismissed) return;
    api.get('/api/onboarding/status').then(r => {
      const s: Status = r.data;
      if (!s.hasWhatsapp || !s.hasContacts || !s.hasCampaign) {
        setStatus(s);
        setVisible(true);
      }
    }).catch(() => {});
  }, []);

  if (!visible || !status) return null;

  const completed = [status.hasWhatsapp, status.hasContacts, status.hasCampaign].filter(Boolean).length;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        onClick={() => { onClick(); setVisible(false); localStorage.setItem('guide_dismissed', '1'); }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg border border-border bg-card text-sm font-medium text-foreground hover:shadow-xl transition-shadow"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
             style={{ background: 'hsl(220 73% 49%)' }}>
          {completed}/3
        </div>
        Setup checklist
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </motion.button>
    </AnimatePresence>
  );
}
