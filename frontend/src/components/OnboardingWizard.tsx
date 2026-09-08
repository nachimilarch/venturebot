// OnboardingWizard.tsx — first-run setup guide for new tenants
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, Circle, ArrowRight, MessageSquare,
  Users, Megaphone, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Step {
  id:    string;
  icon:  React.ReactNode;
  title: string;
  desc:  string;
  cta:   string;
  href:  string;
  check: (s: Status) => boolean;
}

interface Status {
  hasWhatsapp: boolean;
  hasContacts: boolean;
  hasCampaign: boolean;
}

const STEPS: Step[] = [
  {
    id: 'whatsapp', icon: <MessageSquare className="w-5 h-5" />,
    title: 'Connect WhatsApp',
    desc:  'Add your Meta phone number ID and API token to start sending messages.',
    cta:   'Go to Settings',  href: '/settings',
    check: s => s.hasWhatsapp,
  },
  {
    id: 'contacts', icon: <Users className="w-5 h-5" />,
    title: 'Import contacts',
    desc:  'Add phone numbers manually or import a CSV to build your audience.',
    cta:   'Add contacts', href: '/contacts',
    check: s => s.hasContacts,
  },
  {
    id: 'campaign', icon: <Megaphone className="w-5 h-5" />,
    title: 'Send first campaign',
    desc:  'Create and send a template campaign to your contacts.',
    cta:   'New campaign', href: '/campaigns',
    check: s => s.hasCampaign,
  },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('onboarding_dismissed') === '1'
  );
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (dismissed) return;
    (async () => {
      try {
        const { data } = await api.get('/api/onboarding/status');
        setStatus(data);
      } catch {
        setStatus({ hasWhatsapp: false, hasContacts: false, hasCampaign: false });
      }
    })();
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem('onboarding_dismissed', '1');
    setDismissed(true);
  };

  if (dismissed || !status) return null;

  const completed = STEPS.filter(s => s.check(status)).length;
  const allDone   = completed === STEPS.length;

  if (allDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed bottom-4 right-4 w-80 rounded-xl border bg-card shadow-xl z-50"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Getting started</span>
            <span className="text-xs text-muted-foreground">{completed}/{STEPS.length}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(e => !e)}>
              <ArrowRight className={cn('w-3.5 h-3.5 transition-transform', expanded ? 'rotate-90' : '')} />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={dismiss}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-1 bg-primary transition-all duration-500"
            style={{ width: `${(completed / STEPS.length) * 100}%` }}
          />
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-2">
                {STEPS.map(step => {
                  const done = step.check(status);
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg p-3 transition-colors',
                        done ? 'opacity-60' : 'bg-muted/40',
                      )}
                    >
                      <div className="mt-0.5">
                        {done
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Circle className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium', done && 'line-through text-muted-foreground')}>
                          {step.title}
                        </p>
                        {!done && <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>}
                        {!done && (
                          <Button
                            size="sm" variant="link"
                            className="h-auto p-0 text-xs mt-1"
                            onClick={() => navigate(step.href)}
                          >
                            {step.cta} →
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 pb-3">
                <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground">
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
