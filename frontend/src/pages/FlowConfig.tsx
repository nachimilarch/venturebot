// src/pages/FlowConfig.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
    Save, Plus, Trash2, RefreshCw, Settings, MessageSquare,
    Clock, Calendar, Users, ChevronDown, ChevronUp, Info,
    CheckCircle, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentType {
    id: string;
    title: string;
    description: string;
}

interface FlowConfigData {
    welcome_message: string;
    ask_interest_msg: string;
    ask_budget_msg: string;
    onboarding_done_msg: string;
    menu_header_msg: string;
    talk_team_msg: string;
    appointment_types: AppointmentType[];
    slot_times: string[];
    slot_days_ahead: number;
    industry_prompt: string;
    contact_info: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_CONFIG: FlowConfigData = {
    welcome_message: '',
    ask_interest_msg: '',
    ask_budget_msg: '',
    onboarding_done_msg: '',
    menu_header_msg: '',
    talk_team_msg: '',
    appointment_types: [
        { id: 'type_visit', title: 'In-Person Visit', description: 'Visit our office or location' },
        { id: 'type_call', title: 'Phone Call', description: "We'll call you at a set time" },
        { id: 'type_video', title: 'Video Call', description: 'Online meeting via Google Meet' },
    ],
    slot_times: ['10:00 AM', '12:00 PM', '03:00 PM', '05:00 PM'],
    slot_days_ahead: 2,
    industry_prompt: 'requirement',
    contact_info: '',
};

const PLACEHOLDER = {
    welcome_message: `👋 Hi! Welcome to *{bizName}*.\n\nI can help you:\n✅ Share your requirements\n✅ Book an appointment\n✅ Connect with our team\n\nCould you tell me your *full name*?`,
    ask_interest_msg: `Nice to meet you, *{name}*! 😊\n\nWhat are you looking for?\n\n_Please describe briefly_`,
    ask_budget_msg: `Got it! And what is your approximate *budget* or *timeline*?`,
    onboarding_done_msg: `✅ *Thank you, {name}!*\n\nYour details have been saved. Our team will review them.\n\nWhat would you like to do next?`,
    menu_header_msg: `{greeting}\n\nHow can I help you today?`,
    talk_team_msg: `💬 *Talk to Our Team*\n\nA member of our team will reach out to you shortly. 🙏`,
};

const TIME_OPTIONS = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function slugify(str: string) {
    return 'type_' + str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
    value: string;
}> = ({ icon, title, subtitle, children, value }) => (
    <AccordionItem value={value} className="border border-border rounded-xl overflow-hidden mb-3">
        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors [&>svg]:hidden">
            <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 rounded-lg bg-tenant-accent/10 flex items-center justify-center text-tenant-accent flex-shrink-0">
                    {icon}
                </div>
                <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200 accordion-chevron" />
            </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-1 border-t border-border bg-muted/10">
            {children}
        </AccordionContent>
    </AccordionItem>
);

// ─── Variable badge ───────────────────────────────────────────────────────────

const VarBadge: React.FC<{ vars: string[] }> = ({ vars }) => (
    <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3">
        <span className="text-xs text-muted-foreground">Available variables:</span>
        {vars.map(v => (
            <code key={v} className="text-[11px] bg-muted border border-border rounded px-1.5 py-0.5 text-tenant-accent font-mono">
                {`{${v}}`}
            </code>
        ))}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const FlowConfig: React.FC = () => {
    const [config, setConfig] = useState<FlowConfigData>(EMPTY_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // ── Load on mount ────────────────────────────────────────────────────────

    useEffect(() => {
        axios.get('/api/flow-config')
            .then(({ data }) => {
                if (data.success && data.data && Object.keys(data.data).length > 0) {
                    const d = data.data;
                    setConfig({
                        ...EMPTY_CONFIG,
                        ...d,
                        appointment_types: Array.isArray(d.appointment_types)
                            ? d.appointment_types
                            : EMPTY_CONFIG.appointment_types,
                        slot_times: Array.isArray(d.slot_times)
                            ? d.slot_times
                            : EMPTY_CONFIG.slot_times,
                        slot_days_ahead: d.slot_days_ahead ?? 2,
                    });
                }
            })
            .catch(() => toast.error('Failed to load flow config'))
            .finally(() => setIsLoading(false));
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const update = (key: keyof FlowConfigData, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
        setSaveSuccess(false);
    };

    // ── Appointment types ────────────────────────────────────────────────────

    const addApptType = () => {
        update('appointment_types', [
            ...config.appointment_types,
            { id: `type_${Date.now()}`, title: '', description: '' },
        ]);
    };

    const updateApptType = (index: number, field: keyof AppointmentType, value: string) => {
        const updated = config.appointment_types.map((t, i) => {
            if (i !== index) return t;
            const next = { ...t, [field]: value };
            if (field === 'title') next.id = slugify(value) || t.id;
            return next;
        });
        update('appointment_types', updated);
    };

    const removeApptType = (index: number) => {
        update('appointment_types', config.appointment_types.filter((_, i) => i !== index));
    };

    // ── Time slots ───────────────────────────────────────────────────────────

    const toggleSlotTime = (time: string) => {
        const current = config.slot_times;
        const updated = current.includes(time)
            ? current.filter(t => t !== time)
            : [...current, time].sort();
        update('slot_times', updated);
    };

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (config.appointment_types.some(t => !t.title.trim())) {
            toast.error('All appointment types must have a title');
            return;
        }
        if (config.slot_times.length === 0) {
            toast.error('Select at least one time slot');
            return;
        }

        setIsSaving(true);
        try {
            await axios.post('/api/flow-config', config);
            setIsDirty(false);
            setSaveSuccess(true);
            toast.success('Flow config saved! Changes are live. ✅');
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            toast.error('Failed to save config');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Reset to defaults ────────────────────────────────────────────────────

    const handleReset = () => {
        setConfig(EMPTY_CONFIG);
        setIsDirty(true);
        setSaveSuccess(false);
        toast.info('Reset to defaults — click Save to apply');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <motion.div
            className="space-y-6 max-w-3xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >

            {/* ── Header ── */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Flow Configuration</h1>
                    <p className="text-muted-foreground mt-1">
                        Customise your WhatsApp bot messages, appointment types and time slots
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className={cn(
                            'min-w-[100px]',
                            saveSuccess
                                ? 'bg-green-600 hover:bg-green-600 text-white'
                                : 'bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground'
                        )}
                    >
                        {isSaving ? (
                            <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</>
                        ) : saveSuccess ? (
                            <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Saved!</>
                        ) : (
                            <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes</>
                        )}
                    </Button>
                </div>
            </motion.div>

            {/* ── Dirty banner ── */}
            {isDirty && !saveSuccess && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-sm text-yellow-800"
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    You have unsaved changes. Click <strong className="mx-1">Save Changes</strong> to apply.
                </motion.div>
            )}

            {/* ── Info banner ── */}
            <motion.div variants={itemVariants}
                className="flex items-start gap-2 rounded-xl bg-muted border border-border px-4 py-3"
            >
                <Info className="w-4 h-4 text-tenant-accent mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Leave any message blank to use the <span className="text-foreground font-medium">default template</span>.
                    Use <code className="bg-background border border-border rounded px-1 text-tenant-accent font-mono text-[11px]">{'{bizName}'}</code>,{' '}
                    <code className="bg-background border border-border rounded px-1 text-tenant-accent font-mono text-[11px]">{'{name}'}</code>,{' '}
                    <code className="bg-background border border-border rounded px-1 text-tenant-accent font-mono text-[11px]">{'{greeting}'}</code> as dynamic variables.
                </p>
            </motion.div>

            {/* ── Accordion Sections ── */}
            <motion.div variants={itemVariants}>
                <Accordion type="multiple" defaultValue={['onboarding', 'appt-types', 'slots']}>

                    {/* ── 1. Industry ── */}
                    <Section value="industry" icon={<Settings className="w-4 h-4" />}
                        title="Industry Settings"
                        subtitle="Set the context label used in onboarding messages"
                    >
                        <div className="space-y-4 pt-2">
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1.5 block">
                                    Industry / Requirement Prompt
                                </Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Used in "What is your ___?" — e.g. <em>property type</em>, <em>health concern</em>, <em>course</em>
                                </p>
                                <Input
                                    value={config.industry_prompt}
                                    onChange={e => update('industry_prompt', e.target.value)}
                                    placeholder="requirement"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1.5 block">
                                    Contact Info <span className="text-muted-foreground font-normal">(shown in Talk to Team)</span>
                                </Label>
                                <Input
                                    value={config.contact_info}
                                    onChange={e => update('contact_info', e.target.value)}
                                    placeholder="+91-XXXXXXXXXX · support@yourbiz.com"
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                    </Section>

                    {/* ── 2. Onboarding Messages ── */}
                    <Section value="onboarding" icon={<MessageSquare className="w-4 h-4" />}
                        title="Onboarding Messages"
                        subtitle="What the bot says when a new user messages for the first time"
                    >
                        <div className="space-y-5 pt-2">

                            {/* Welcome */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1 block">Welcome Message</Label>
                                <VarBadge vars={['bizName']} />
                                <Textarea
                                    value={config.welcome_message}
                                    onChange={e => update('welcome_message', e.target.value)}
                                    placeholder={PLACEHOLDER.welcome_message}
                                    rows={5}
                                    className="text-sm font-mono resize-none"
                                />
                            </div>

                            {/* Ask Interest */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1 block">
                                    Ask Interest / Requirement
                                </Label>
                                <VarBadge vars={['name']} />
                                <Textarea
                                    value={config.ask_interest_msg}
                                    onChange={e => update('ask_interest_msg', e.target.value)}
                                    placeholder={PLACEHOLDER.ask_interest_msg}
                                    rows={4}
                                    className="text-sm font-mono resize-none"
                                />
                            </div>

                            {/* Ask Budget */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1 block">Ask Budget / Timeline</Label>
                                <Textarea
                                    value={config.ask_budget_msg}
                                    onChange={e => update('ask_budget_msg', e.target.value)}
                                    placeholder={PLACEHOLDER.ask_budget_msg}
                                    rows={3}
                                    className="text-sm font-mono resize-none"
                                />
                            </div>

                            {/* Onboarding Done */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1 block">
                                    Onboarding Complete Message
                                </Label>
                                <VarBadge vars={['name']} />
                                <Textarea
                                    value={config.onboarding_done_msg}
                                    onChange={e => update('onboarding_done_msg', e.target.value)}
                                    placeholder={PLACEHOLDER.onboarding_done_msg}
                                    rows={4}
                                    className="text-sm font-mono resize-none"
                                />
                            </div>
                        </div>
                    </Section>

                    {/* ── 3. Menu & Support ── */}
                    <Section value="menu" icon={<Users className="w-4 h-4" />}
                        title="Main Menu & Support"
                        subtitle="The main menu greeting and Talk to Team message"
                    >
                        <div className="space-y-5 pt-2">

                            {/* Menu header */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1 block">Menu Header Message</Label>
                                <VarBadge vars={['greeting']} />
                                <Textarea
                                    value={config.menu_header_msg}
                                    onChange={e => update('menu_header_msg', e.target.value)}
                                    placeholder={PLACEHOLDER.menu_header_msg}
                                    rows={3}
                                    className="text-sm font-mono resize-none"
                                />
                            </div>

                            {/* Talk to team */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1 block">Talk to Team Message</Label>
                                <VarBadge vars={['bizName']} />
                                <Textarea
                                    value={config.talk_team_msg}
                                    onChange={e => update('talk_team_msg', e.target.value)}
                                    placeholder={PLACEHOLDER.talk_team_msg}
                                    rows={4}
                                    className="text-sm font-mono resize-none"
                                />
                            </div>
                        </div>
                    </Section>

                    {/* ── 4. Appointment Types ── */}
                    <Section value="appt-types" icon={<Calendar className="w-4 h-4" />}
                        title="Appointment Types"
                        subtitle="The options shown when a user wants to book an appointment"
                    >
                        <div className="space-y-3 pt-2">
                            {config.appointment_types.map((appt, index) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-border bg-card p-4 space-y-3 relative group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Type {index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeApptType(index)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Title *</Label>
                                            <Input
                                                value={appt.title}
                                                onChange={e => updateApptType(index, 'title', e.target.value)}
                                                placeholder="e.g. In-Person Visit"
                                                className="h-8 text-sm"
                                                maxLength={24}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                ID: <code className="font-mono">{appt.id}</code>
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                                            <Input
                                                value={appt.description}
                                                onChange={e => updateApptType(index, 'description', e.target.value)}
                                                placeholder="e.g. Visit our office"
                                                className="h-8 text-sm"
                                                maxLength={72}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {config.appointment_types.length < 10 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addApptType}
                                    className="w-full border-dashed"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Appointment Type
                                </Button>
                            )}

                            {config.appointment_types.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground py-4">
                                    No types added — defaults will be used
                                </p>
                            )}
                        </div>
                    </Section>

                    {/* ── 5. Time Slots ── */}
                    <Section value="slots" icon={<Clock className="w-4 h-4" />}
                        title="Appointment Time Slots"
                        subtitle="Select available times shown to users when booking"
                    >
                        <div className="space-y-4 pt-2">

                            {/* Days ahead */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-1.5 block">
                                    How many days ahead to show slots?
                                </Label>
                                <Select
                                    value={String(config.slot_days_ahead)}
                                    onValueChange={v => update('slot_days_ahead', Number(v))}
                                >
                                    <SelectTrigger className="h-9 w-40 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 7].map(d => (
                                            <SelectItem key={d} value={String(d)}>
                                                {d} day{d > 1 ? 's' : ''} ahead
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Time grid */}
                            <div>
                                <Label className="text-xs font-medium text-foreground mb-2 block">
                                    Available Times{' '}
                                    <span className="text-muted-foreground font-normal">
                                        ({config.slot_times.length} selected)
                                    </span>
                                </Label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {TIME_OPTIONS.map(time => {
                                        const selected = config.slot_times.includes(time);
                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => toggleSlotTime(time)}
                                                className={cn(
                                                    'text-xs rounded-lg border-2 py-2 px-1 font-medium transition-all focus:outline-none',
                                                    selected
                                                        ? 'border-tenant-accent bg-tenant-accent/10 text-tenant-accent'
                                                        : 'border-border bg-card text-muted-foreground hover:border-tenant-accent/50'
                                                )}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                                {config.slot_times.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2">⚠️ Select at least one time slot</p>
                                )}
                            </div>
                        </div>
                    </Section>

                </Accordion>
            </motion.div>

            {/* ── Bottom Save Bar ── */}
            {isDirty && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky bottom-4 z-10"
                >
                    <div className="flex items-center justify-between gap-4 bg-foreground text-background rounded-xl px-5 py-3 shadow-xl">
                        <p className="text-sm font-medium">You have unsaved changes</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleReset}
                                className="h-8 text-xs"
                                disabled={isSaving}
                            >
                                Discard
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-8 text-xs bg-white text-black hover:bg-white/90"
                            >
                                {isSaving
                                    ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Saving...</>
                                    : <><Save className="w-3 h-3 mr-1" /> Save Now</>
                                }
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}

        </motion.div>
    );
};

export default FlowConfig;