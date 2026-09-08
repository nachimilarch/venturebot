import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  MessageSquare, BarChart3, Users,
  CheckCircle2, ArrowRight, Star, Calendar,
  Send, Repeat2, Globe,
  Zap, Crown, Gift, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Static content ────────────────────────────────────────────────────────────

const BRAND = {
  name:    'VaartaBot',
  tagline: 'Business CRM & Communication Platform',
  hero:    'Automate conversations. Convert leads. Grow faster.',
  sub:     'Send bulk campaigns, manage leads, and run automated messaging — all from one platform. Built for every business, every industry.',
  trust:   'Trusted by growing businesses across India',
};

const NAV_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing',      href: '#pricing'      },
];

const STATS = [
  { label: 'Messages Delivered', value: '2.5M+' },
  { label: 'Active Businesses',  value: '500+'  },
  { label: 'Campaigns Sent',     value: '12K+'  },
  { label: 'Delivery Rate',      value: '98.4%' },
];

const FEATURES = [
  {
    icon:  Send,
    title: 'Bulk Campaigns',
    desc:  'Blast personalised messages to thousands of opted-in contacts in seconds. Schedule ahead, use approved templates, and track every delivery.',
  },
  {
    icon:  Repeat2,
    title: 'Auto-Reply Flows',
    desc:  'Build keyword-triggered chatbot flows that respond instantly — 24/7. Handle FAQs, qualify leads, and book appointments without lifting a finger.',
  },
  {
    icon:  Users,
    title: 'Lead CRM',
    desc:  'Every inbound message becomes a tracked lead. Assign, segment, follow up, and close — all inside your VaartaBot dashboard.',
  },
  {
    icon:  Calendar,
    title: 'Appointment Scheduling',
    desc:  'Let customers book slots directly through your platform. Automated confirmations, reminders, and rescheduling keep your calendar full.',
  },
  {
    icon:  BarChart3,
    title: 'Real-time Analytics',
    desc:  'See open rates, click-throughs, replies, and conversions for every campaign the moment they happen.',
  },
  {
    icon:  Globe,
    title: 'Multi-tenant & Teams',
    desc:  'Manage multiple business accounts or team members under one roof. Role-based access keeps every workspace clean and secure.',
  },
];

const STEPS = [
  {
    n:     '01',
    title: 'Create your workspace',
    desc:  'Sign up free, enter your business name, and your workspace is ready in seconds.',
  },
  {
    n:     '02',
    title: 'Connect your channel',
    desc:  'Enter your messaging API credentials. We verify and sync your approved templates automatically.',
  },
  {
    n:     '03',
    title: 'Launch your first campaign',
    desc:  'Pick a template, upload contacts, and hit send. Watch delivery receipts roll in live.',
  },
  {
    n:     '04',
    title: 'Track & convert',
    desc:  'Monitor opens, replies, and bookings from the dashboard and optimise as you go.',
  },
];

// ─── Credit packages — kept in sync with Billing.tsx ─────────────────────────
const PRICING = [
  {
    name:           'Starter',
    price:          '₹999',
    credits:        500,
    pricePerCredit: 2.00,
    savings:        null as number | null,
    popular:        false,
    icon:           Zap,
    description:    'Try it out — no big commitment',
    perks: [
      '500 message credits',
      '₹2.00 per message',
      'Bulk campaigns',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    name:           'Basic',
    price:          '₹3,499',
    credits:        2000,
    pricePerCredit: 1.75,
    savings:        13 as number | null,
    popular:        false,
    icon:           MessageSquare,
    description:    'Great for small campaigns',
    perks: [
      '2,000 message credits',
      '₹1.75 per message',
      'Save 13% vs Starter',
      'Bulk campaigns',
      'Basic analytics',
    ],
  },
  {
    name:           'Growth',
    price:          '₹8,499',
    credits:        5000,
    pricePerCredit: 1.70,
    savings:        15 as number | null,
    popular:        true,
    icon:           Crown,
    description:    'Best for growing businesses',
    perks: [
      '5,000 message credits',
      '₹1.70 per message',
      'Save 15% vs Starter',
      'Chatbot auto-reply flows',
      'Full analytics & reports',
      'Priority support',
    ],
  },
  {
    name:           'Pro',
    price:          '₹23,999',
    credits:        15000,
    pricePerCredit: 1.60,
    savings:        20 as number | null,
    popular:        false,
    icon:           Gift,
    description:    'High volume at great value',
    perks: [
      '15,000 message credits',
      '₹1.60 per message',
      'Save 20% vs Starter',
      'Appointment scheduling',
      'CRM integrations',
      'Priority support',
    ],
  },
  {
    name:           'Enterprise',
    price:          '₹44,999',
    credits:        30000,
    pricePerCredit: 1.50,
    savings:        25 as number | null,
    popular:        false,
    icon:           Sparkles,
    description:    'Maximum volume, best price',
    perks: [
      '30,000 message credits',
      '₹1.50 per message',
      'Save 25% vs Starter',
      'Dedicated account manager',
      'SLA & uptime guarantee',
      'Custom onboarding',
    ],
  },
];

const TESTIMONIALS = [
  {
    quote:    '"We automated 80% of our patient follow-ups via messaging. Appointment no-shows dropped by half within the first week."',
    name:     'Dr. Rajesh Kumar',
    role:     'Pharmatrix Clinic, Mumbai',
    rating:   5,
    initials: 'RK',
  },
  {
    quote:    '"Our launch campaign hit 78% open rate. We have never seen numbers like that with email or SMS."',
    name:     'Sana Mehta',
    role:     'VWMC Realty, Dubai',
    rating:   5,
    initials: 'SM',
  },
  {
    quote:    '"Setup took 10 minutes. By end of day one we had 40 new leads from a single broadcast campaign."',
    name:     'Priya Anand',
    role:     'VS Diet Concept, Bangalore',
    rating:   5,
    initials: 'PA',
  },
];

// ─── SVG dot-grid backgrounds (extracted to avoid quote-escaping issues) ───────
const DOT_GRID_LIGHT = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;
const DOT_GRID_DARK  = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// ─── Animation helpers ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0  },
};

function RevealSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

const Index: React.FC = () => {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!target) return;
      e.preventDefault();
      const id = (target.getAttribute('href') ?? '').slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--tenant-accent))] flex items-center justify-center shadow">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">{BRAND.name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Log in
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 60% 0%, hsl(var(--tenant-accent)/0.12), transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: DOT_GRID_LIGHT }}
        />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center gap-2 bg-[hsl(var(--tenant-accent)/0.12)] text-[hsl(var(--tenant-accent))] text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--tenant-accent))]" />
                  Business CRM Platform
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-5">
                  {BRAND.hero.split('. ').map((part, i, arr) => (
                    <span key={i}>
                      {i === 1
                        ? <span className="text-[hsl(var(--tenant-accent))]">{part}</span>
                        : part}
                      {i < arr.length - 1 ? '. ' : ''}
                    </span>
                  ))}
                </h1>

                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">{BRAND.sub}</p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Link to="/register">
                    <Button size="lg" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-12 px-7">
                      Start for free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <a href="#how-it-works">
                    <Button variant="outline" size="lg" className="h-12 px-7 font-semibold">
                      See how it works
                    </Button>
                  </a>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--tenant-accent))]" />
                  No credit card required &nbsp;·&nbsp; Live in under 5 minutes
                </p>
              </motion.div>
            </div>

            {/* Right — Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="hidden lg:block"
              aria-hidden="true"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-muted-foreground">VaartaBot Dashboard</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Sent Today',    val: '2,841', up: '↑ 18%' },
                      { label: 'Open Rate',     val: '68%',   up: '↑ 4%'  },
                      { label: "Today's Appts", val: '34',    up: '↑ 6'   },
                    ].map(s => (
                      <div key={s.label} className="bg-background rounded-xl p-3 border border-border">
                        <div className="text-base font-bold text-foreground">{s.val}</div>
                        <div className="text-[11px] text-muted-foreground">{s.label}</div>
                        <div className="text-[11px] font-semibold text-green-600 mt-0.5">{s.up}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-background rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-3">Recent Campaigns</div>
                    {[
                      { name: 'Summer Sale Blast',   status: 'Live',      cls: 'bg-green-100 text-green-700' },
                      { name: 'Onboarding Flow',     status: 'Scheduled', cls: 'bg-[hsl(var(--tenant-accent)/0.12)] text-[hsl(var(--tenant-accent))]' },
                      { name: 'Reactivation Series', status: 'Sent',      cls: 'bg-muted text-muted-foreground' },
                    ].map(c => (
                      <div key={c.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center">
                            <Send className="w-3 h-3 text-[hsl(var(--tenant-accent))]" />
                          </div>
                          <span className="text-xs font-medium text-foreground">{c.name}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.cls}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-background rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Delivery — last 7 days</div>
                    <div className="flex items-end gap-1 h-10">
                      {[35, 55, 40, 70, 60, 85, 75].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}%`,
                            background: i >= 5 ? 'hsl(var(--tenant-accent))' : 'hsl(var(--tenant-accent)/0.25)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">Everything your team needs</h2>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              From your first bulk campaign to a fully automated chatbot — VaartaBot gives you one workspace to build, send, and measure every customer interaction.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <RevealSection key={title} delay={i * 0.07}>
                <div className="group bg-card border border-border rounded-2xl p-6 h-full transition-all duration-200 hover:shadow-lg hover:border-[hsl(var(--tenant-accent)/0.3)] hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--tenant-accent)/0.2)] transition-colors">
                    <Icon className="w-5 h-5 text-[hsl(var(--tenant-accent))]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-sidebar relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, hsl(var(--tenant-accent)/0.08), transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: DOT_GRID_DARK }}
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--sidebar-primary))] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-sidebar-foreground mb-4">Live in minutes, not weeks</h2>
            <p className="text-sidebar-muted text-lg max-w-lg leading-relaxed">
              No technical setup. Connect your number and start reaching customers the same day.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, desc }, i) => (
              <RevealSection key={n} delay={i * 0.1}>
                <div className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-5 left-[calc(100%_-_12px)] w-full h-px bg-sidebar-border z-0" />
                  )}
                  <div className="relative z-10 bg-sidebar-accent/60 border border-sidebar-border rounded-2xl p-6">
                    <div className="w-10 h-10 rounded-full border border-sidebar-border bg-sidebar flex items-center justify-center text-sm font-bold text-[hsl(var(--sidebar-primary))] mb-4">
                      {n}
                    </div>
                    <h3 className="font-semibold text-sidebar-foreground mb-2">{title}</h3>
                    <p className="text-sm text-sidebar-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
              Pay per message. No subscriptions.
            </h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Buy a credit pack, use them whenever you want. Credits never expire.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
            {PRICING.map(({ name, price, credits, pricePerCredit, savings, popular, icon: Icon, description, perks }, i) => (
              <RevealSection key={name} delay={i * 0.07}>
                <div
                  className={`relative rounded-2xl p-5 border flex flex-col h-full ${
                    popular
                      ? 'bg-[hsl(var(--tenant-accent))] border-[hsl(var(--tenant-accent))] text-white shadow-xl'
                      : 'bg-card border-border'
                  }`}
                >
                  {/* Popular badge */}
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      MOST POPULAR
                    </div>
                  )}

                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${popular ? 'bg-white/20' : 'bg-[hsl(var(--tenant-accent)/0.12)]'}`}>
                      <Icon className={`w-4 h-4 ${popular ? 'text-white' : 'text-[hsl(var(--tenant-accent))]'}`} />
                    </div>
                    {savings !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${popular ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                        -{savings}%
                      </span>
                    )}
                  </div>

                  {/* Plan name */}
                  <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${popular ? 'text-white/70' : 'text-muted-foreground'}`}>{name}</p>

                  {/* Price */}
                  <p className={`text-3xl font-bold tracking-tight mb-0.5 ${popular ? 'text-white' : 'text-foreground'}`}>{price}</p>

                  {/* Credits */}
                  <p className={`text-xs font-semibold mb-0.5 ${popular ? 'text-white/80' : 'text-[hsl(var(--tenant-accent))]'}`}>
                    {credits.toLocaleString()} credits
                  </p>

                  {/* Per-message rate + description */}
                  <p className={`text-[11px] mb-4 leading-relaxed ${popular ? 'text-white/60' : 'text-muted-foreground'}`}>
                    ₹{pricePerCredit.toFixed(3)}/msg · {description}
                  </p>

                  <hr className={`mb-4 ${popular ? 'border-white/20' : 'border-border'}`} />

                  {/* Perks */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {perks.map(p => (
                      <li key={p} className={`flex items-start gap-2 text-xs ${popular ? 'text-white/90' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${popular ? 'text-white/70' : 'text-[hsl(var(--tenant-accent))]'}`} />
                        {p}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to="/register" className="block mt-auto">
                    <Button
                      size="sm"
                      className={`w-full font-semibold text-xs ${
                        popular
                          ? 'bg-white text-[hsl(var(--tenant-accent))] hover:bg-white/90'
                          : 'bg-[hsl(var(--tenant-accent))] text-white hover:bg-[hsl(var(--tenant-accent)/0.9)]'
                      }`}
                    >
                      Get started
                    </Button>
                  </Link>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={0.3} className="mt-8">
            <p className="text-center text-xs text-muted-foreground">
              1 credit = 1 message delivered &nbsp;·&nbsp; Credits never expire &nbsp;·&nbsp; No subscription required
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ══ CTA BANNER ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto px-6">
          <RevealSection>
            <div className="relative rounded-2xl overflow-hidden bg-sidebar p-12 text-center">
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ backgroundImage: DOT_GRID_DARK }}
              />
              <div className="relative z-10">
                <p className="text-xs font-semibold text-[hsl(var(--sidebar-primary))] uppercase tracking-widest mb-4">Start today</p>
                <h2 className="text-3xl lg:text-4xl font-bold text-sidebar-foreground mb-4 tracking-tight">
                  Your first campaign is waiting.
                </h2>
                <p className="text-sidebar-muted text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  Join hundreds of businesses automating their customer outreach with VaartaBot — free to start, no credit card needed.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link to="/register">
                    <Button size="lg" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-12 px-8">
                      Create free account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-12 px-8">
                      Log in to dashboard
                    </Button>
                  </Link>
                </div>
                <p className="text-sidebar-muted text-xs mt-6">Trial plan · No credit card · Cancel anytime</p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--tenant-accent))] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">{BRAND.name}</span>
          </Link>
          <nav className="flex flex-wrap gap-6">
            {[
              ...NAV_LINKS,
              { label: 'Login',   href: '/login'    },
              { label: 'Sign up', href: '/register' },
              { label: 'Privacy', href: '/privacy'  },
              { label: 'Terms',   href: '/terms'    },
              { label: 'Refund & Cancellation',   href: '/refund'},
              { label: 'Contact Us',   href: '/contact'},
            ].map(l => (
              <a key={l.label} href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">© 2026 VaartaBot. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default Index;