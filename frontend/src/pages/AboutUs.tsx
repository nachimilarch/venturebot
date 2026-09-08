// src/pages/AboutUs.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MessageSquare, ArrowLeft, Mail, Phone, MapPin,
    Send, CheckCircle2, ArrowRight, Code2, Cpu, Users2,
    Zap, Globe2, ShieldCheck, Heart, Target, TrendingUp,
    Bell, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ─── Data ──────────────────────────────────────────────────────────────────────

const CONTACT_INFO = [
    {
        icon: Mail,
        label: 'Email us',
        value: 'hello@vaartabot.in',
        sub: 'We reply within 24 hours',
        href: 'mailto:hello@vaartabot.in',
    },
    {
        icon: Phone,
        label: 'Call us',
        value: '+91 8686903927',
        sub: 'Mon – Sat, 9 AM – 6 PM IST',
        href: 'tel:+918686903927',
    },
    {
        icon: MapPin,
        label: 'Location',
        value: 'Hyderabad, Telangana',
        sub: 'India',
        href: null,
    },
];

const FAQS = [
    {
        q: 'How does VaartaBot help manage leads?',
        a: 'Every customer who messages your business is automatically captured as a lead. VaartaBot collects their name, interest, and budget — then tracks them in a built-in CRM dashboard so nothing slips through.',
    },
    {
        q: 'What is 1 credit?',
        a: '1 credit = 1 WhatsApp message delivered. Credits never expire and are deducted only when a message is successfully sent.',
    },
    {
        q: 'Can I follow up with leads automatically?',
        a: 'Yes. VaartaBot sends automated follow-up messages, appointment reminders, and campaign updates to your leads — keeping them engaged without any manual effort.',
    },
    {
        q: 'Can I use VaartaBot for my industry?',
        a: 'Absolutely. VaartaBot works for any business — healthcare, education, real estate, retail, finance, and more. If your customers message you on WhatsApp, VaartaBot captures and manages those leads for you.',
    },
    {
        q: 'What is your refund policy?',
        a: 'If we are unable to deliver the Service, you are entitled to a refund. Refund requests must be raised within the stipulated time period. See our Terms & Conditions for details.',
    },
];

const VALUES = [
    {
        icon: Target,
        title: 'Never Miss a Lead',
        desc: 'Every customer interaction is captured, tracked, and followed up — automatically. No lead left behind.',
    },
    {
        icon: ShieldCheck,
        title: 'Reliable & Compliant',
        desc: 'Fully compliant messaging. Data hosted in India on AWS Mumbai. Built for scale.',
    },
    {
        icon: Globe2,
        title: 'Built for India',
        desc: 'Designed with Indian businesses in mind — affordable pricing, regional industries, local support.',
    },
    {
        icon: Heart,
        title: 'Customer Obsessed',
        desc: 'We treat every customer query as a priority. Real humans respond — backed by smart automation.',
    },
];

const FEATURES = [
    {
        icon: Users2,
        title: 'Automatic Lead Capture',
        desc: 'Every new customer message becomes a lead instantly — name, interest, and budget collected automatically.',
        color: 'bg-green-500/10 text-green-600',
    },
    {
        icon: BarChart3,
        title: 'Lead Scoring & Tracking',
        desc: 'Leads are scored and tracked through a built-in CRM. Know exactly where every prospect stands.',
        color: 'bg-blue-500/10 text-blue-600',
    },
    {
        icon: Bell,
        title: 'Automated Follow-Ups',
        desc: 'Send timely follow-up messages, reminders, and offers to leads — without lifting a finger.',
        color: 'bg-orange-500/10 text-orange-600',
    },
    {
        icon: TrendingUp,
        title: 'Bulk Campaign Manager',
        desc: 'Re-engage cold leads with targeted bulk campaigns. Send promotions and updates to thousands at once.',
        color: 'bg-purple-500/10 text-purple-600',
    },
    {
        icon: MessageSquare,
        title: '24/7 Auto-Reply Bot',
        desc: 'Greet every customer instantly, day or night. Qualify leads while your team is off the clock.',
        color: 'bg-pink-500/10 text-pink-600',
    },
    {
        icon: Zap,
        title: 'Appointment Booking',
        desc: 'Convert leads into booked appointments directly on WhatsApp — no phone calls or back-and-forth.',
        color: 'bg-yellow-500/10 text-yellow-600',
    },
];

const PRODUCTS = [
    {
        icon: MessageSquare,
        name: 'VaartaBot',
        desc: 'A WhatsApp automation platform for businesses. Auto-replies, lead management, appointment booking and CRM — all in one.',
        tag: 'SaaS Platform',
        color: 'bg-green-500/10 text-green-600',
    },
    {
        icon: Cpu,
        name: 'Pharmatrix',
        desc: 'Doctor and patient engagement tool with appointment booking and medical history storage. Powered by AI.',
        tag: 'HealthTech',
        color: 'bg-blue-500/10 text-blue-600',
    },
    {
        icon: Code2,
        name: 'Cipher',
        desc: 'A complete pharma billing, reporting, and HRMS tool built for pharma businesses and distributors.',
        tag: 'Enterprise Software',
        color: 'bg-purple-500/10 text-purple-600',
    },
];

type FormState = {
    name: string; email: string; phone: string;
    subject: string; message: string;
};

const EMPTY: FormState = { name: '', email: '', phone: '', subject: '', message: '' };

// ─── Component ─────────────────────────────────────────────────────────────────

const AboutUs: React.FC = () => {
    const [form, setForm] = useState<FormState>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const set = (k: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
            toast.error('Please fill in name, email, and message.');
            return;
        }
        setLoading(true);
        await new Promise(r => setTimeout(r, 1200));
        setLoading(false);
        setSubmitted(true);
        toast.success('Message sent! We will get back to you shortly.');
    };

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Nav ── */}
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

            {/* ── Hero ── */}
            <section className="bg-sidebar relative overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, hsl(var(--tenant-accent)/0.1), transparent)' }}
                />
                <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <p className="text-xs font-semibold text-[hsl(var(--sidebar-primary))] uppercase tracking-widest mb-3">
                            About Us
                        </p>
                        <h1 className="text-4xl lg:text-5xl font-bold text-sidebar-foreground mb-4 tracking-tight">
                            Stop losing leads.<br className="hidden sm:block" /> Start closing more.
                        </h1>
                        <p className="text-sidebar-muted text-lg max-w-2xl leading-relaxed">
                            VaartaBot by Milarch Tech helps businesses capture every lead, follow up automatically,
                            and convert more WhatsApp conversations into real customers.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── Contact Info Cards ── */}
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

            {/* ── Our Story ── */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">
                            Our Story
                        </p>
                        <h2 className="text-3xl font-bold text-foreground mb-5 leading-tight">
                            Built to solve the #1 problem every business faces — missed leads.
                        </h2>
                        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                Milarch Tech started with one simple observation — most Indian businesses were losing
                                customers simply because they couldn't respond on WhatsApp fast enough. Leads would
                                message, wait, and move on. Appointments were missed. Follow-ups were forgotten.
                            </p>
                            <p>
                                We built <span className="text-foreground font-medium">VaartaBot</span> to solve exactly that.
                                A platform that manages every lead automatically and keeps
                                them engaged with smart follow-ups — all without manual effort.
                            </p>
                            <p>
                                Today, Milarch Tech builds and operates multiple software products for healthcare,
                                pharma, education, real estate, and beyond. All made in Hyderabad. All built for India.
                            </p>
                        </div>
                    </motion.div>

                    {/* Founder Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                    >
                        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--tenant-accent))] flex items-center justify-center shadow-md">
                                    <Users2 className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
                                        Founder & Developer
                                    </p>
                                    <h3 className="text-xl font-bold text-foreground tracking-tight">
                                        Nachiketh M Desai
                                    </h3>
                                    <p className="text-sm text-[hsl(var(--tenant-accent))] font-medium">
                                        Milarch Tech · Hyderabad
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                Nachiketh is the founder and lead developer at Milarch Tech. He built VaartaBot,
                                Pharmatrix, and Cipher from the ground up — with a focus on making powerful
                                technology accessible to every Indian business, regardless of size or industry.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {['Full Stack Dev', 'Lead Automation', 'SaaS Builder', 'AI Integration'].map(tag => (
                                    <span
                                        key={tag}
                                        className="text-xs font-medium px-3 py-1 rounded-full bg-[hsl(var(--tenant-accent)/0.1)] text-[hsl(var(--tenant-accent))]"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Our Products ── */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center mb-10">
                    <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-2">
                        Our Products
                    </p>
                    <h2 className="text-3xl font-bold text-foreground">Built by Milarch Tech</h2>
                    <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
                        We design and develop in-house software products that solve real problems for Indian businesses.
                    </p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {PRODUCTS.map(({ icon: Icon, name, desc, tag, color }, i) => (
                        <motion.div
                            key={name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-card border border-border rounded-2xl p-6 shadow-sm"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${color} mb-3 inline-block`}>
                                {tag}
                            </span>
                            <h3 className="text-lg font-bold text-foreground mb-2">{name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── Contact Form + FAQ ── */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12">

                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                        >
                            <h2 className="text-2xl font-bold text-foreground mb-2">Get in touch</h2>
                            <p className="text-muted-foreground text-sm mb-8">
                                Want a demo or have a question? Fill in the form and we'll get back within 24 hours.
                            </p>

                            {submitted ? (
                                <div className="flex flex-col items-center justify-center text-center py-16 border border-border rounded-2xl bg-card">
                                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-7 h-7 text-[hsl(var(--tenant-accent))]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">Message received!</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                                        Thanks for reaching out. Our team will get back to you at{' '}
                                        <span className="text-foreground font-medium">{form.email}</span> within 24 hours.
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY); setSubmitted(false); }}>
                                        Send another message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full name <span className="text-red-500">*</span></Label>
                                            <Input id="name" placeholder="Rajesh Kumar" value={form.name} onChange={set('name')} className="h-11" disabled={loading} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email address <span className="text-red-500">*</span></Label>
                                            <Input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} className="h-11" disabled={loading} required />
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone number</Label>
                                            <Input id="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} className="h-11" disabled={loading} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Subject</Label>
                                            <Input id="subject" placeholder="Demo request / Support / Other" value={form.subject} onChange={set('subject')} className="h-11" disabled={loading} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                                        <textarea
                                            id="message" rows={5}
                                            placeholder="Tell us how we can help..."
                                            value={form.message} onChange={set('message')}
                                            disabled={loading} required
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
                                                <Send className="w-4 h-4" /> Send message
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

                        {/* FAQ */}
                        <motion.div
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                        >
                            <h2 className="text-2xl font-bold text-foreground mb-2">Frequently asked questions</h2>
                            <p className="text-muted-foreground text-sm mb-8">Quick answers to the most common questions.</p>
                            <div className="space-y-3">
                                {FAQS.map(({ q, a }, i) => (
                                    <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                            className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-muted/30 transition-colors"
                                        >
                                            <span className="text-sm font-semibold text-foreground">{q}</span>
                                            <ArrowRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-90' : ''}`} />
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
                                <p className="text-sm font-semibold text-foreground mb-1">Ready to capture more leads?</p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Create a free account and start managing your leads on WhatsApp today.
                                </p>
                                <Link to="/register">
                                    <Button size="sm" className="bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold">
                                        Create free account
                                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-border bg-background">
                <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">© 2026 VaartaBot by Milarch Tech. All rights reserved.</p>
                    <div className="flex gap-5">
                        <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
                        <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
                        <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default AboutUs;