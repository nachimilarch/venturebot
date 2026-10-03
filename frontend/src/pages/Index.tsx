import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Factory, Bot, Repeat2, Users, Calendar, BarChart3,
  Smartphone, PhoneCall, Zap, CalendarCheck, Clock3, IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import FloatingContact from '@/components/site/FloatingContact';
import CircuitBackdrop from '@/components/site/CircuitBackdrop';
import ChatDemo from '@/components/site/ChatDemo';
import CostCalculator from '@/components/site/CostCalculator';
import { accent } from '@/components/site/brand';

// ─── Content ───────────────────────────────────────────────────────────────────

const PROOF = [
  { icon: Clock3, label: 'IndiaMart enquiries answered', value: 'within 15 min' },
  { icon: Bot, label: 'AI replies to customers', value: '24/7' },
  { icon: IndianRupee, label: 'Starts at', value: '₹999, no monthly fee' },
  { icon: CalendarCheck, label: 'Setup', value: 'Done with you on one call' },
];

const STEPS = [
  {
    icon: Smartphone,
    title: 'Create your free account',
    desc: 'Sign up in a minute. On a free setup call we connect your business number and your IndiaMart account with you.',
  },
  {
    icon: Bot,
    title: 'Tell VaartaBot about your business',
    desc: 'Add your products, prices, timings and FAQs. Switch on AI replies and IndiaMart auto-reply.',
  },
  {
    icon: PhoneCall,
    title: 'Close the leads it hands you',
    desc: 'Every enquiry gets a reply in minutes and lands in your CRM with the full chat. Your team calls the warm ones.',
  },
];

const FEATURES = [
  { icon: Factory, title: 'IndiaMart auto-reply', desc: 'New IndiaMart buyers get a personalised reply within 15 minutes, before competitors call back.' },
  { icon: Bot, title: 'AI replies, 24/7', desc: 'Answers questions about your products and prices at 2 am, on Sundays and during festivals.' },
  { icon: Calendar, title: 'Bookings in chat', desc: 'Customers pick a slot in the chat. Confirmations and reminders go out automatically.' },
  { icon: Repeat2, title: 'Automatic follow-ups', desc: 'Drip messages remind quiet leads and stop the moment the customer replies.' },
  { icon: BarChart3, title: 'Reports that matter', desc: 'See enquiries, replies, bookings and conversions by day, by source and by team member.' },
  { icon: Users, title: 'One inbox for the team', desc: 'Every chat and lead in one place, with separate logins for your staff.' },
];

const PACKS = [
  { name: 'Starter', price: 999, credits: 500, rate: 2.0, best: 'Trying it out' },
  { name: 'Basic', price: 3499, credits: 2000, rate: 1.75, best: 'Small shops and clinics' },
  { name: 'Growth', price: 8499, credits: 5000, rate: 1.7, best: 'Busy IndiaMart sellers', popular: true },
  { name: 'Pro', price: 23999, credits: 15000, rate: 1.6, best: 'Multi-branch businesses' },
  { name: 'Enterprise', price: 44999, credits: 30000, rate: 1.5, best: 'High volume' },
];

const FAQS = [
  {
    q: 'What exactly does VaartaBot do?',
    a: 'It answers the enquiries your business receives, instantly and around the clock. It replies to IndiaMart buyers, answers questions from your price list, books appointments, follows up with leads who go quiet, and keeps every conversation and lead in one CRM so your team knows who to call.',
  },
  {
    q: 'Can I see every conversation?',
    a: 'Yes. Every chat appears in one shared inbox with the lead it belongs to. You can step in and reply yourself at any time, and the AI only answers from the products, prices and FAQs you give it.',
  },
  {
    q: 'How does pricing work?',
    a: 'You buy credits: 1 credit = 1 automated reply or follow-up VaartaBot sends for you. There is no monthly fee and credits never expire. AI features come with 50,000 free AI tokens; top-ups start at ₹299. Prices exclude GST.',
  },
  {
    q: 'How does IndiaMart auto-reply work?',
    a: 'Add your IndiaMart CRM key in Settings and write your welcome reply. VaartaBot checks for new IndiaMart enquiries every 15 minutes, replies to each buyer, and saves them as a lead.',
  },
  {
    q: "I'm not technical. Can I still use it?",
    a: 'Yes. Book a free setup call and we connect your number, load your price list and switch on the replies with you. Most businesses are live in one call.',
  },
  {
    q: 'Can my staff use it too?',
    a: 'Yes. Add team members with their own logins. Everyone works from the same inbox and lead list, so no enquiry is answered twice or missed.',
  },
];

// ─── Small pieces ──────────────────────────────────────────────────────────────

const Eyebrow: React.FC<{ children: React.ReactNode; dark?: boolean; tone?: number }> = ({ children, dark, tone = 0 }) => (
  <p
    className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"
    style={{ color: dark ? accent(tone).onDark : accent(tone).fg }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: dark ? accent(tone).onDark : accent(tone).fg }} />
    {children}
  </p>
);

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0.001, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const PrimaryCta: React.FC<{ label?: string }> = ({ label = 'Start for free' }) => (
  <Link to="/register">
    <Button size="lg" className="h-12 bg-tenant-accent px-7 font-semibold text-white hover:bg-[hsl(var(--tenant-accent)/0.9)]">
      {label} <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </Link>
);

const SecondaryCta: React.FC<{ label?: string }> = ({ label = 'Book a free setup call' }) => (
  <Link to="/contact">
    <Button size="lg" variant="outline" className="h-12 border-[#5F40B5]/40 px-7 font-semibold text-[#2E0B63] hover:bg-[#ECE7FA] hover:text-[#2E0B63]">
      {label}
    </Button>
  </Link>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

const Index: React.FC = () => {
  const location = useLocation();

  // Arriving from another page with /#section: scroll once the page has rendered.
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80);
    return () => clearTimeout(t);
  }, [location.hash]);

  return (
    <div className="site-bg min-h-screen text-foreground">
      <SiteHeader />

      {/* ══ HERO + LIVE DEMO ═══════════════════════════════════════════════ */}
      <section id="demo" className="relative scroll-mt-16 overflow-hidden">
        <div className="site-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(180deg,black,transparent_85%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[-6rem] top-24 h-[26rem] w-[26rem] rounded-full bg-[#7B5CE0]/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[14rem] top-[22rem] h-[18rem] w-[18rem] rounded-full bg-[#2DB8C1]/25 blur-3xl" aria-hidden="true" />
        <CircuitBackdrop opacity={0.07} color="#137F88" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-tenant-accent-light px-3 py-1 text-xs font-semibold text-[#137F88]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#137F88]" /> AI sales assistant and CRM for Indian businesses
            </span>
            <h1 className="mb-5 text-4xl font-bold leading-[1.08] text-foreground sm:text-5xl lg:text-[3.4rem]" style={{ textWrap: 'balance' } as React.CSSProperties}>
              Never miss an enquiry. <span className="bg-gradient-to-r from-[#137F88] via-[#2DB8C1] to-[#5F40B5] bg-clip-text text-transparent">Reply first, every time.</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
              VaartaBot answers enquiries from IndiaMart, your website and chat in minutes, day and night, and keeps every lead in one CRM.
            </p>
            <div className="mb-6 flex flex-wrap gap-3">
              <PrimaryCta />
              <SecondaryCta />
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {['Free account', 'No monthly fee', 'Credits never expire'].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#137F88]" />{t}</span>
              ))}
            </p>
            <p className="mt-10 hidden items-center gap-2 text-sm font-medium text-foreground lg:flex">
              <Zap className="h-4 w-4 text-[#137F88]" /> Pick a business on the right and watch VaartaBot handle a real-looking enquiry.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ChatDemo />
          </div>
        </div>
      </section>

      {/* ══ PROOF STRIP ════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-white/70 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {PROOF.map(({ icon: Icon, label, value }, i) => (
            <div key={label} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: accent(i).bg }}>
                <Icon className="h-5 w-5" style={{ color: accent(i).fg }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="scroll-mt-16 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-12 max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-3xl font-bold sm:text-4xl">Live in one call. Three steps.</h2>
          </Reveal>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <li className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent(i).fg }} aria-hidden="true" />
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: accent(i).bg }}>
                      <Icon className="h-5 w-5" style={{ color: accent(i).fg }} />
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: accent(i).bg, color: accent(i).fg }}>Step {i + 1}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ FEATURES ═══════════════════════════════════════════════════════ */}
      <section id="features" className="site-band-dark relative scroll-mt-16 overflow-hidden py-24 text-sidebar-foreground">
        <CircuitBackdrop opacity={0.16} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-12 max-w-2xl">
            <Eyebrow dark>What VaartaBot does</Eyebrow>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Everything between "Hi, price?" and a confirmed order.</h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${accent(i).onDark}22` }}>
                    <Icon className="h-5 w-5" style={{ color: accent(i).onDark }} />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-sidebar-muted">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COST CALCULATOR + PACKS ════════════════════════════════════════ */}
      <section id="pricing" className="site-band-violet scroll-mt-16 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-10 max-w-2xl">
            <Eyebrow tone={1}>Pricing</Eyebrow>
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">Pay only for what you use. Nothing every month.</h2>
            <p className="text-lg text-muted-foreground">Tell us how many enquiries you get and see what VaartaBot costs, per enquiry and per month.</p>
          </Reveal>
          <Reveal><CostCalculator /></Reveal>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PACKS.map(p => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-5 ${p.popular ? 'border-[#137F88] bg-tenant-accent-light' : 'border-border bg-card'}`}
              >
                {p.popular && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-[#137F88] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{p.name}</p>
                <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>₹{p.price.toLocaleString('en-IN')}</p>
                <p className="text-sm font-semibold text-[#137F88]">{p.credits.toLocaleString('en-IN')} credits</p>
                <p className="mb-4 text-xs text-muted-foreground">₹{p.rate.toFixed(2)} per credit · {p.best}</p>
                <Link to="/register" className="mt-auto">
                  <Button size="sm" variant={p.popular ? 'default' : 'outline'} className={`w-full font-semibold ${p.popular ? 'bg-tenant-accent text-white hover:bg-[hsl(var(--tenant-accent)/0.9)]' : ''}`}>
                    Choose {p.name}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Every pack includes everything: AI replies, IndiaMart auto-reply, chatbot flows, CRM, bookings and team logins. Credits never expire.
          </p>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <section id="faq" className="scroll-mt-16 py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <Eyebrow tone={2}>Questions</Eyebrow>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Straight answers.</h2>
            <p className="text-muted-foreground">
              Still unsure? <Link to="/contact" className="font-semibold text-[#137F88] underline-offset-4 hover:underline">Book a free setup call</Link> and
              we'll walk you through it.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <Accordion type="single" collapsible defaultValue="faq-0" className="rounded-2xl border border-border bg-card px-5">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className={i === FAQS.length - 1 ? 'border-b-0' : ''}>
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="site-cta-gradient relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-14 text-center shadow-xl sm:px-12">
          <CircuitBackdrop opacity={0.14} />
          <div className="relative">
            <img src="/brand/vaartabot-icon-for-dark-bg.svg" alt="" className="mx-auto mb-6 h-16 w-16" />
            <h2 className="mx-auto mb-4 max-w-2xl text-3xl font-bold text-white sm:text-4xl">Your next enquiry is already on its way.</h2>
            <p className="mx-auto mb-8 max-w-lg text-lg text-white/75">Make sure it gets a reply in minutes, not hours.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="h-12 bg-white px-7 font-semibold text-[#2E0B63] hover:bg-white/90">
                  Create free account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-7 font-semibold text-white hover:bg-white/10 hover:text-white">
                  Book a free setup call
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <FloatingContact />
    </div>
  );
};

export default Index;
