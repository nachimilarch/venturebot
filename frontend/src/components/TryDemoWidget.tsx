import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

type TemplateChoice = 'vaartabot_welcome' | 'milarch_vaartabot_promo';

const TEMPLATE_OPTIONS: { value: TemplateChoice; label: string; needsName: boolean }[] = [
  { value: 'vaartabot_welcome', label: 'VaartaBot Welcome', needsName: false },
  { value: 'milarch_vaartabot_promo', label: 'What VaartaBot can do (promo)', needsName: true },
];

export default function TryDemoWidget() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<TemplateChoice>('vaartabot_welcome');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const selected = TEMPLATE_OPTIONS.find(t => t.value === template)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({ title: 'Enter a valid phone number', variant: 'destructive' });
      return;
    }
    if (selected.needsName && !name.trim()) {
      toast({ title: 'Name is required for this message', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/public/demo-message', {
        phone: digits,
        name: name.trim(),
        template,
      });
      if (data.success) {
        setSent(true);
        toast({ title: 'Sent! Check WhatsApp.', description: `We just messaged ${phone}.` });
      } else {
        toast({ title: 'Could not send', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Could not send',
        description: err.response?.data?.error || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 max-w-md w-full">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-5 h-5 text-[hsl(var(--tenant-accent))]" />
        <h3 className="text-lg font-bold text-foreground">Get a message from VaartaBot</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Pick a message and enter your WhatsApp number — we'll send it to you right now.
      </p>

      {sent ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--tenant-accent)/0.12)] flex items-center justify-center mx-auto mb-3">
            <Send className="w-5 h-5 text-[hsl(var(--tenant-accent))]" />
          </div>
          <p className="font-semibold text-foreground mb-1">Message sent!</p>
          <p className="text-sm text-muted-foreground">Check WhatsApp on {phone}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Choose a message
            </Label>
            <RadioGroup
              value={template}
              onValueChange={(v) => setTemplate(v as TemplateChoice)}
              className="space-y-2"
            >
              {TEMPLATE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  htmlFor={opt.value}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-[hsl(var(--tenant-accent))] has-[[data-state=checked]]:bg-[hsl(var(--tenant-accent)/0.06)]"
                >
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {selected.needsName && (
            <div>
              <Label htmlFor="demo-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Your name
              </Label>
              <Input
                id="demo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan"
                maxLength={60}
              />
            </div>
          )}

          <div>
            <Label htmlFor="demo-phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Your WhatsApp number
            </Label>
            <Input
              id="demo-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              inputMode="tel"
              maxLength={16}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[hsl(var(--tenant-accent))] hover:bg-[hsl(var(--tenant-accent)/0.9)] text-white font-semibold h-11"
          >
            {loading
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Send className="w-4 h-4 mr-2" />}
            {loading ? 'Sending…' : 'Send me the message'}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            By submitting, you agree to receive one WhatsApp message from Milarch Tech. Reply STOP anytime to opt out.
          </p>
        </form>
      )}
    </div>
  );
}
