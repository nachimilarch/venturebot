import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Users, BarChart3, CheckCircle2, ArrowRight, Star,
  Repeat2, Layers, GitBranch, Bell, Filter, Lock,
  Zap, Crown, Gift, Sparkles, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Static content ────────────────────────────────────────────────────────────

const BRAND = {
  name: 'VaartaBot',
  tagline: 'Lead Management Platform',
  hero: 'Manage leads. Track pipelines. Connect your tools.',
  sub: 'A powerful lead management platform that centralises your leads, tracks every interaction, and integrates with your existing software — all in one clean dashboard.',
  trust: 'Trusted by growing businesses across India',
};

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Pricing', href: '#pricing' },
];

const STATS = [
  { label: 'Leads Managed', value: '1.2M+' },
  { label: 'Active Businesses', value: '500+' },
  { label: 'Integrations', value: '40+' },
  { label: 'Conversion Uplift', value: '3.2x' },
];

const FEATURES = [
  {
    icon: Users,
    title: 'Centralised Lead Inbox',
    desc: 'Aggregate leads from every source — web forms, landing pages, third-party CRMs, and integrations — into a single, organised inbox.',
  },
  {
    icon: Filter,
    title: 'Smart Segmentation',
    desc: 'Tag, filter, and segment leads by source, stage, score, or custom attributes. Find exactly who you need in seconds.',
  },
  {
    icon: GitBranch,
    title: 'Pipeline Management',
    desc: 'Drag-and-drop pipeline boards let you move leads through custom stages. Every status change is logged with a timestamp.',
  },
  {
    icon: Zap,
    title: 'Seamless Integrations',
    desc: 'Connect VaartaBot to any software you already use — ERP, CRM, billing, or custom tools — via our simple integration system.',
  },
  {
    icon: Bell,
    title: 'Automated Follow-ups',
    desc: 'Set time-based or event-triggered follow-up reminders so no lead ever goes cold. Assign tasks to team members automatically.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track lead volume, conversion rates, pipeline velocity, and team performance across every source and stage in real time.',
  },
  {
    icon: Repeat2,
    title: 'Two-way Sync',
    desc: 'Push and pull lead data between VaartaBot and your existing tools. Changes in one platform reflect everywhere, instantly.',
  },
  {
    icon: Lock,
    title: 'Role-based Access',
    desc: 'Control exactly who sees what. Assign admin, manager, and agent roles. Keep sensitive lead data secure across your team.',
  },
  {
    icon: Layers,
    title: 'Multi-team Workspaces',
    desc: 'Run multiple business units or client accounts under one roof. Each workspace is fully isolated with its own pipeline and settings.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create your workspace',
    desc: 'Sign up free, set up your team, and configure your lead pipeline stages in minutes.',
  },
  {
    n: '02',
    title: 'Connect your sources',
    desc: 'Use our native connectors or integration layer to pull leads from your existing tools automatically.',
  },
  {
    n: '03',
    title: 'Manage & track leads',
    desc: 'Move leads through your pipeline, assign to team members, log interactions, and set follow-up reminders.',
  },
  {
    n: '04',
    title: 'Integrate & automate',
    desc: 'Push converted leads or updates back to your CRM, ERP, or billing software in real time.',
  },
];

const INTEGRATIONS = [
  { name: 'Native Connectors', desc: 'One-click setup for popular platforms' },
  { name: 'Webhooks', desc: 'Real-time event push to any endpoint' },
  { name: 'Zapier', desc: 'No-code automation with 5000+ apps' },
  { name: 'Google Sheets', desc: 'Two-way lead sync via connector' },
  { name: 'Salesforce', desc: 'Bidirectional CRM sync' },
  { name: 'HubSpot', desc: 'Lead import and status push' },
  { name: 'Zoho CRM', desc: 'Native integration support' },
  { name: 'Custom Software', desc: 'Any system via our integration layer' },
];

const PRICING = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    description: 'Perfect for small teams getting started',
    popular: false,
    icon: Zap,
    perks: [
      '1 pipeline',
      '2 team members',
      'Basic integrations',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '₹2,499',
    period: '/month',
    description: 'Best for growing sales teams',
    popular: true,
    icon: Crown,
    perks: [
      '5 pipelines',
      '10 team members',
      'All integrations',
      'Automated follow-ups',
      'Advanced analytics',
      'Priority support',
    ],
  },
  {
    name: 'Pro',
    price: '₹5,999',
    period: '/month',
    description: 'For high-volume lead operations',
    popular: false,
    icon: Gift,
    perks: [
      'Unlimited pipelines',
      '25 team members',
      'All integrations',
      'Custom automation flows',
      'Full analytics suite',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large teams with custom needs',
    popular: false,
    icon: Sparkles,
    perks: [
      'Unlimited pipelines',
      'Unlimited team members',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Onboarding support',
    ],
  },
];

const TESTIMONIALS = [
  {
    quote: '"VaartaBot replaced three separate tools for us. Our leads from all sources now land in one place and our conversion rate went up by 40%."',
    name: 'Rahul Sharma',
    role: 'Head of Sales, TechNova India',
    rating: 5,
    initials: 'RS',
  },
  {
    quote: '"The integration with our custom ERP was done in a day. The sync is rock solid and our team adopted it instantly."',
    name: 'Anita Verma',
    role: 'CTO, GrowthStack Solutions',
    rating: 5,
    initials: 'AV',
  },
  {
    quote: '"We manage 8 sales teams across 3 cities from one dashboard. The pipeline view alone saved us hours of spreadsheet work every week."',
    name: 'Karthik Nair',
    role: 'Director, Pinnacle Realty Group',
    rating: 5,
    initials: 'KN',
  },
];

// ─── SVG dot-grid backgrounds ─────────────────────────────────────────────────
const DOT_GRID_LIGHT = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;
const DOT_GRID_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// ─── Animation helpers ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function RevealSection({
  children, className = '', delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref} variants={fadeUp} initial="hidden"
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
              <Users className="w-4 h-4 text-white" />
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
            <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
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
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 60% 0%, hsl(var(--tenant-accent)/0.12), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: DOT_GRID_LIGHT }} />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
                <div className="inline-flex items-center gap-2 bg-[hsl(var(--tenant-accent)/0.12)] text-[hsl(var(--tenant-accent))] text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--tenant-accent))]" />
                  Lead Management Platform
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-5">
                  {BRAND.hero.split('. ').map((part, i, arr) => (
                    <span key={i}>
                      {i === 1 ? <span className="text-[hsl(var(--tenant-accent))]">{part}</span> : part}
                      {i < arr.length - 1 ? '. ' : ''}
                    </span>
                  ))}
                </h1>

                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">{BRAND.sub}</p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Link to="/register">
                    <Button size="lg" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-12 px-7">
                      Start for free <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <a href="#how-it-works">
                    <Button variant="outline" size="lg" className="h-12 px-7 font-semibold">See how it works</Button>
                  </a>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--tenant-accent))]" />
                  No credit card required &nbsp;·&nbsp; Live in under 5 minutes
                </p>
              </motion.div>
            </div>

            {/* Right — Dashboard mockup */}
            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="hidden lg:block" aria-hidden="true">
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-muted-foreground">VaartaBot — Lead Pipeline</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'New Leads', val: '142', up: '18%' },
                      { label: 'In Progress', val: '89', up: '7%' },
                      { label: 'Converted', val: '34', up: '12%' },
                    ].map(s => (
                      <div key={s.label} className="bg-background rounded-xl p-3 border border-border">
                        <div className="text-base font-bold text-foreground">{s.val}</div>
                        <div className="text-[11px] text-muted-foreground">{s.label}</div>
                        <div className="text-[11px] font-semibold text-green-600 mt-0.5">+{s.up}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-background rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-3">Pipeline — Today</div>
                    {[
                      { name: 'Arjun Mehta — Website Form', stage: 'New', cls: 'bg-blue-100 text-blue-700' },
                      { name: 'Priya Iyer — Integration', stage: 'Contacted', cls: 'bg-yellow-100 text-yellow-700' },
                      { name: 'Rohan Das — Zoho Sync', stage: 'Qualified', cls: 'bg-[hsl(var(--tenant-accent)/0.12)] text-[hsl(var(--tenant-accent))]' },
                      { name: 'Sneha Rao — Manual Entry', stage: 'Converted', cls: 'bg-green-100 text-green-700' },
                    ].map(c => (
                      <div key={c.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center">
                            <Users className="w-3 h-3 text-[hsl(var(--tenant-accent))]" />
                          </div>
                          <span className="text-xs font-medium text-foreground">{c.name}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.cls}`}>{c.stage}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-background rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Lead volume — last 7 days</div>
                    <div className="flex items-end gap-1 h-10">
                      {[35, 55, 40, 70, 60, 85, 75].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm"
                          style={{ height: `${h}%`, background: i >= 5 ? 'hsl(var(--tenant-accent))' : 'hsl(var(--tenant-accent)/0.25)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ STATS STRIP ══════════════════════════════════════════════════════ */}
      <div className="border-y border-border bg-sidebar">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <RevealSection key={s.label} delay={i * 0.08} className="text-center">
                <p className="text-3xl font-bold text-sidebar-foreground">{s.value}</p>
                <p className="text-xs text-sidebar-muted mt-1">{s.label}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </div>

      {/* ══ FEATURES ═════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">Everything you need to manage leads</h2>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              From managing your leads to closing the deal and syncing back to your tools — VaartaBot gives you a single platform to manage the entire journey.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <RevealSection key={title} delay={i * 0.06}>
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
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, hsl(var(--tenant-accent)/0.08), transparent)' }} />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: DOT_GRID_DARK }} />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--sidebar-primary))] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-sidebar-foreground mb-4">Up and running in minutes</h2>
            <p className="text-sidebar-muted text-lg max-w-lg leading-relaxed">
              No complex setup. Connect your lead sources, configure your pipeline, and start tracking from day one.
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

      {/* ══ INTEGRATIONS ═════════════════════════════════════════════════════ */}
      <section id="integrations" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Integrations</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">Connects to the tools you already use</h2>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              VaartaBot is built for connectivity. Integrate with any CRM, ERP, or custom software via our simple integration layer — no technical expertise required.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTEGRATIONS.map(({ name, desc }, i) => (
              <RevealSection key={name} delay={i * 0.05}>
                <div className="bg-card border border-border rounded-2xl p-5 hover:border-[hsl(var(--tenant-accent)/0.4)] hover:shadow-md transition-all duration-200">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center mb-3">
                    <GitBranch className="w-4 h-4 text-[hsl(var(--tenant-accent))]" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{name}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={0.3} className="mt-10">
            <div className="bg-sidebar rounded-2xl border border-sidebar-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-sidebar-foreground mb-1">Need a custom integration?</p>
                <p className="text-xs text-sidebar-muted max-w-md">
                  Any software that supports data exchange can connect to VaartaBot. Our team will help you set it up in hours, not weeks.
                </p>
              </div>
              <Link to="/contact" className="shrink-0">
                <Button size="sm" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold whitespace-nowrap">
                  Talk to our team <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Choose the plan that fits your team. Upgrade or downgrade anytime — no lock-in.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {PRICING.map(({ name, price, period, description, popular, icon: Icon, perks }, i) => (
              <RevealSection key={name} delay={i * 0.08}>
                <div className={`relative rounded-2xl p-6 border flex flex-col h-full ${popular
                    ? 'bg-[hsl(var(--tenant-accent))] border-[hsl(var(--tenant-accent))] text-white shadow-xl'
                    : 'bg-card border-border'
                  }`}>
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      MOST POPULAR
                    </div>
                  )}

                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 ${popular ? 'bg-white/20' : 'bg-[hsl(var(--tenant-accent)/0.12)]'}`}>
                    <Icon className={`w-4 h-4 ${popular ? 'text-white' : 'text-[hsl(var(--tenant-accent))]'}`} />
                  </div>

                  <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${popular ? 'text-white/70' : 'text-muted-foreground'}`}>{name}</p>

                  <div className="flex items-end gap-1 mb-1">
                    <p className={`text-3xl font-bold tracking-tight ${popular ? 'text-white' : 'text-foreground'}`}>{price}</p>
                    {period && <p className={`text-sm mb-1 ${popular ? 'text-white/70' : 'text-muted-foreground'}`}>{period}</p>}
                  </div>

                  <p className={`text-[11px] mb-5 leading-relaxed ${popular ? 'text-white/60' : 'text-muted-foreground'}`}>{description}</p>

                  <hr className={`mb-5 ${popular ? 'border-white/20' : 'border-border'}`} />

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {perks.map(p => (
                      <li key={p} className={`flex items-start gap-2 text-xs ${popular ? 'text-white/90' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${popular ? 'text-white/70' : 'text-[hsl(var(--tenant-accent))]'}`} />
                        {p}
                      </li>
                    ))}
                  </ul>

                  <Link to={price === 'Custom' ? '/contact' : '/register'} className="block mt-auto">
                    <Button size="sm" className={`w-full font-semibold text-xs ${popular
                        ? 'bg-white text-[hsl(var(--tenant-accent))] hover:bg-white/90'
                        : 'bg-[hsl(var(--tenant-accent))] text-white hover:bg-[hsl(var(--tenant-accent)/0.9)]'
                      }`}>
                      {price === 'Custom' ? 'Contact us' : 'Get started'}
                    </Button>
                  </Link>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={0.3} className="mt-8">
            <p className="text-center text-xs text-muted-foreground">
              All plans include a <span className="text-foreground font-medium">14-day free trial</span>.
              No credit card required. Cancel anytime.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ══ TESTIMONIALS ═════════════════════════════════════════════════════ */}
      <section className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="mb-14">
            <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Customer stories</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Businesses growing with VaartaBot</h2>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ quote, name, role, rating, initials }, i) => (
              <RevealSection key={name} delay={i * 0.1}>
                <div className="bg-card border border-border rounded-2xl p-6 h-full flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 italic">{quote}</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="w-9 h-9 rounded-full bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center text-xs font-bold text-[hsl(var(--tenant-accent))]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{role}</p>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6">
          <RevealSection>
            <div className="relative rounded-2xl overflow-hidden bg-sidebar p-12 text-center">
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: DOT_GRID_DARK }} />
              <div className="relative z-10">
                <p className="text-xs font-semibold text-[hsl(var(--sidebar-primary))] uppercase tracking-widest mb-4">Start today</p>
                <h2 className="text-3xl lg:text-4xl font-bold text-sidebar-foreground mb-4 tracking-tight">
                  Your leads deserve better than a spreadsheet.
                </h2>
                <p className="text-sidebar-muted text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  Join hundreds of businesses using VaartaBot to manage leads, track pipelines, and connect their software — free to start.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link to="/register">
                    <Button size="lg" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-12 px-8">
                      Create free account <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-12 px-8">
                      Talk to sales
                    </Button>
                  </Link>
                </div>
                <p className="text-sidebar-muted text-xs mt-6">14-day free trial · No credit card · Cancel anytime</p>
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
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">{BRAND.name}</span>
          </Link>
          <nav className="flex flex-wrap gap-6">
            {[
              ...NAV_LINKS,
              { label: 'Login', href: '/login' },
              { label: 'Sign up', href: '/register' },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Refund & Cancellation', href: '/refund' },
              { label: 'About Us', href: '/about' },
            ].map(l => (
              <a key={l.label} href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">2026 VaartaBot. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default Index;