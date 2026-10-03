// Interactive "see it work" demo: pick a business type and watch VaartaBot handle an enquiry,
// message by message, ending with what lands in the CRM. All conversations are labelled examples.
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, RotateCcw, Factory, Stethoscope, GraduationCap } from 'lucide-react';

type Msg =
  | { from: 'system'; text: string }
  | { from: 'customer'; text: string; time: string }
  | { from: 'bot'; text: string; time: string; buttons?: string[] };

type Scenario = {
  id: string;
  label: string;
  icon: React.ElementType;
  business: string;
  result: string;
  messages: Msg[];
};

const SCENARIOS: Scenario[] = [
  {
    id: 'indiamart',
    label: 'IndiaMart seller',
    icon: Factory,
    business: 'Shree Pipes & Fittings',
    result: 'Lead saved: Rahul · 500 units · Pune · Call booked 10:00 am',
    messages: [
      { from: 'system', text: 'New IndiaMart enquiry · 11:47 pm' },
      { from: 'bot', time: '11:47 pm', text: 'Hi Rahul, thanks for your IndiaMart enquiry for 12 mm GI pipes. Our price list is attached. How many units do you need?' },
      { from: 'customer', time: '11:49 pm', text: 'About 500 units, delivery to Pune.' },
      { from: 'bot', time: '11:49 pm', text: 'For 500 units it is ₹48 per unit, delivered in 3 days. Shall our team call you tomorrow at 10 am?', buttons: ['Yes, call me', 'Send quote'] },
      { from: 'customer', time: '11:50 pm', text: 'Yes, call me' },
      { from: 'bot', time: '11:50 pm', text: 'Done. Call booked for 10:00 am tomorrow. You will get a reminder.' },
    ],
  },
  {
    id: 'clinic',
    label: 'Clinic',
    icon: Stethoscope,
    business: 'Sunrise Family Clinic',
    result: 'Appointment booked: Dr. Rao · Tomorrow 11:30 am · Reminder at 9:00 am',
    messages: [
      { from: 'customer', time: '9:12 pm', text: 'Hi, is Dr. Rao available tomorrow?' },
      { from: 'bot', time: '9:12 pm', text: 'Yes. Dr. Rao has these slots free tomorrow:', buttons: ['10:30 am', '11:30 am', '4:00 pm'] },
      { from: 'customer', time: '9:13 pm', text: '11:30 am' },
      { from: 'bot', time: '9:13 pm', text: 'Booked with Dr. Rao, tomorrow at 11:30 am. I will remind you at 9 am. Reply CHANGE to reschedule.' },
    ],
  },
  {
    id: 'coaching',
    label: 'Coaching centre',
    icon: GraduationCap,
    business: 'Bright Minds Academy',
    result: 'Demo class booked: Saturday 5:00 pm · Follow-up set for Monday',
    messages: [
      { from: 'customer', time: '7:40 pm', text: 'What are the fees for the JEE batch?' },
      { from: 'bot', time: '7:40 pm', text: 'The JEE 2027 batch is ₹85,000 a year, with weekday-evening and weekend options. Would you like a free demo class?', buttons: ['Book demo', 'Talk to counsellor'] },
      { from: 'customer', time: '7:41 pm', text: 'Book demo' },
      { from: 'bot', time: '7:41 pm', text: 'Your free demo class is on Saturday at 5 pm. See you there!' },
    ],
  },
];

const STEP_MS = 1300;

const ChatDemo: React.FC = () => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [runId, setRunId] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scenario = SCENARIOS[active];
  const done = shown >= scenario.messages.length;

  // Play the conversation one message at a time (all at once for reduced motion).
  useEffect(() => {
    if (reduce) { setShown(scenario.messages.length); return; }
    setShown(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    scenario.messages.forEach((m, i) => {
      const at = 500 + i * STEP_MS;
      if (m.from === 'bot') {
        timers.push(setTimeout(() => setTyping(true), at - 650));
      }
      timers.push(setTimeout(() => { setTyping(false); setShown(i + 1); }, at));
    });
    return () => { timers.forEach(clearTimeout); setTyping(false); };
  }, [active, runId, reduce, scenario.messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [shown, typing, reduce]);

  return (
    <div className="w-full max-w-[380px]">
      {/* Scenario picker */}
      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-card p-1.5" role="tablist" aria-label="Choose a business">
        {SCENARIOS.map((s, i) => {
          const Icon = s.icon;
          const on = i === active;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => { setActive(i); setRunId(r => r + 1); }}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                on ? 'bg-tenant-accent text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Phone */}
      <div className="overflow-hidden rounded-[28px] border-[6px] border-[#0D0A1A] bg-[#0D0A1A] shadow-2xl">
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#2E0B63] to-[#137F88] px-4 py-3 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {scenario.business.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{scenario.business}</p>
            <p className="text-[11px] text-white/75">{typing ? 'typing…' : 'replies instantly · VaartaBot'}</p>
          </div>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold tracking-widest">EXAMPLE</span>
        </div>

        <div ref={scrollRef} className="h-[390px] space-y-2 overflow-y-auto bg-[#F3F1FA] px-3 py-4" aria-live="polite">
          <AnimatePresence initial={false}>
            {scenario.messages.slice(0, shown).map((m, i) => (
              <motion.div
                key={`${scenario.id}-${runId}-${i}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={m.from === 'customer' ? 'flex justify-end' : m.from === 'system' ? 'flex justify-center' : 'flex justify-start'}
              >
                {m.from === 'system' ? (
                  <span className="rounded-lg bg-[#FDF0D8] px-3 py-1 text-[11px] font-medium text-[#7A4506]">{m.text}</span>
                ) : (
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-snug text-[#0E1625] shadow-sm ${
                      m.from === 'customer' ? 'rounded-br-md bg-[#DDF3F4]' : 'rounded-bl-md bg-white'
                    }`}
                  >
                    {m.text}
                    {'buttons' in m && m.buttons && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.buttons.map(b => (
                          <span key={b} className="rounded-full border border-[#137F88]/40 px-2.5 py-1 text-[11px] font-semibold text-[#137F88]">{b}</span>
                        ))}
                      </div>
                    )}
                    <span className="ml-2 inline-block translate-y-0.5 text-[10px] text-[#726C89]">
                      {m.time}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
            {typing && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3 shadow-sm">
                  {[0, 1, 2].map(d => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#726C89]" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* What lands in the CRM */}
      <div className="mt-4 min-h-[64px]">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key={`result-${scenario.id}-${runId}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-[#137F88]/30 bg-tenant-accent-light px-4 py-3"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#137F88]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#137F88]">Saved in your CRM</p>
                <p className="text-sm text-foreground">{scenario.result}</p>
              </div>
              <button
                type="button"
                onClick={() => setRunId(r => r + 1)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#137F88] hover:bg-white/60"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Replay
              </button>
            </motion.div>
          ) : (
            <motion.p key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-1 text-center text-xs text-muted-foreground">
              No one on the team is awake. VaartaBot is replying…
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatDemo;
