import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, ArrowLeft, Mail, Phone, MapPin,
  Send, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CONTACT_INFO = [
  {
    icon:  Mail,
    label: 'Email us',
    value: 'hello@vaartabot.in',
    sub:   'We reply within 24 hours',
    href:  'mailto:hello@vaartabot.in',
  },
  {
    icon:  Phone,
    label: 'Call us',
    value: '+91 8686903927',
    sub:   'Mon – Sat, 9 AM – 6 PM IST',
    href:  'tel:+918686903927',
  },
  {
    icon:  MapPin,
    label: 'Location',
    value: 'Hyderabad, Telangana',
    sub:   'India',
    href:  null,
  },
];

const FAQS = [
  {
    q: 'How do I get started with VaartaBot?',
    a: 'Sign up for a free account, purchase a credit pack, connect your WhatsApp Business API credentials, and launch your first campaign — all in under 10 minutes.',
  },
  {
    q: 'What is 1 credit?',
    a: '1 credit = 1 WhatsApp message delivered. Credits never expire and are deducted only when a message is successfully sent.',
  },
  {
    q: 'Do you support WhatsApp Business API (not just the app)?',
    a: 'Yes. VaartaBot is built exclusively on the official WhatsApp Business API, which supports bulk messaging, chatbots, and CRM integrations at scale.',
  },
  {
    q: 'Can I use VaartaBot for my industry?',
    a: 'Absolutely. VaartaBot is industry-agnostic — healthcare, education, e-commerce, real estate, finance, and more. If your customers are on WhatsApp, VaartaBot works for you.',
  },
  {
    q: 'What is your refund policy?',
    a: 'If we are unable to deliver the Service, you are entitled to a refund. Refund requests must be raised within the stipulated time period. See our Terms & Conditions for details.',
  },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const EMPTY: FormState = { name: '', email: '', phone: '', subject: '', message: '' };

const Contact: React.FC = () => {
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq]   = useState<number | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in name, email, and message.');
      return;
    }
    setLoading(true);
    // Replace with your actual API call, e.g. axios.post('/api/contact', form)
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
    toast.success('Message sent! We will get back to you shortly.');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--tenant-accent))] flex items-center justify-center shadow">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">VaartaBot</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="bg-sidebar relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, hsl(var(--tenant-accent)/0.1), transparent)' }}
        />
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold text-[hsl(var(--sidebar-primary))] uppercase tracking-widest mb-3">Contact</p>
            <h1 className="text-4xl lg:text-5xl font-bold text-sidebar-foreground mb-4 tracking-tight">
              We are here to help.
            </h1>
            <p className="text-sidebar-muted text-lg max-w-xl leading-relaxed">
              Have a question, want a demo, or need support? Drop us a message and we will get back to you within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ CONTACT INFO CARDS ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 -mt-6 relative z-10">
        <div className="grid sm:grid-cols-3 gap-4">
          {CONTACT_INFO.map(({ icon: Icon, label, value, sub, href }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[hsl(var(--tenant-accent))]" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                {href ? (
                  <a href={href} className="text-sm font-semibold text-foreground hover:text-[hsl(var(--tenant-accent))] transition-colors">
                    {value}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ FORM + FAQ ═══════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* ── Contact Form ── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">Send us a message</h2>
            <p className="text-muted-foreground text-sm mb-8">Fill in the form below and we will respond within 24 hours.</p>

            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-16 border border-border rounded-2xl bg-card">
                <div className="w-14 h-14 rounded-full bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-7 h-7 text-[hsl(var(--tenant-accent))]" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Message received!</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Thanks for reaching out. Our team will get back to you at <span className="text-foreground font-medium">{form.email}</span> within 24 hours.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setForm(EMPTY); setSubmitted(false); }}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Name + Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      placeholder="Rajesh Kumar"
                      value={form.name}
                      onChange={set('name')}
                      className="h-11"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={set('email')}
                      className="h-11"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Phone + Subject */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={set('phone')}
                      className="h-11"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Demo request / Support / Other"
                      value={form.subject}
                      onChange={set('subject')}
                      className="h-11"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                  <textarea
                    id="message"
                    rows={5}
                    placeholder="Tell us how we can help..."
                    value={form.message}
                    onChange={set('message')}
                    disabled={loading}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send message
                    </span>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting, you agree to our{' '}
                  <Link to="/privacy" className="text-[hsl(var(--tenant-accent))] hover:underline">Privacy Policy</Link>
                  {' '}and{' '}
                  <Link to="/terms" className="text-[hsl(var(--tenant-accent))] hover:underline">Terms of Service</Link>.
                </p>
              </form>
            )}
          </motion.div>

          {/* ── FAQ ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">Frequently asked questions</h2>
            <p className="text-muted-foreground text-sm mb-8">Quick answers to the most common questions.</p>

            <div className="space-y-3">
              {FAQS.map(({ q, a }, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{q}</span>
                    <ArrowRight
                      className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 border-t border-border">
                      <p className="text-sm text-muted-foreground leading-relaxed pt-3">{a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 bg-[hsl(var(--tenant-accent)/0.08)] border border-[hsl(var(--tenant-accent)/0.2)] rounded-2xl p-6">
              <p className="text-sm font-semibold text-foreground mb-1">Ready to get started?</p>
              <p className="text-xs text-muted-foreground mb-4">Create a free account and send your first campaign today.</p>
              <Link to="/register">
                <Button size="sm" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold">
                  Create free account
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 VaartaBot. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/terms"   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/login"   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Contact;
