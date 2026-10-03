// Credit planner: how many credits a business needs, what it costs per enquiry, and which pack fits.
// 1 credit = 1 automated reply or follow-up VaartaBot sends. No monthly fee, credits never expire.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const PACKS = [
  { name: 'Starter', credits: 500, price: 999, rate: 2.0 },
  { name: 'Basic', credits: 2000, price: 3499, rate: 1.75 },
  { name: 'Growth', credits: 5000, price: 8499, rate: 1.7 },
  { name: 'Pro', credits: 15000, price: 23999, rate: 1.6 },
  { name: 'Enterprise', credits: 30000, price: 44999, rate: 1.5 },
];

const LEVELS = [
  { v: 2, l: 'Light', d: 'A reply and one follow-up.' },
  { v: 4, l: 'Typical', d: 'A reply, a booking confirmation and two follow-ups.' },
  { v: 6, l: 'Detailed', d: 'Questions answered, a booking and reminders.' },
  { v: 8, l: 'Heavy', d: 'Longer conversations with several reminders.' },
];

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const CostCalculator: React.FC = () => {
  const [enquiries, setEnquiries] = useState(150);
  const [perEnquiry, setPerEnquiry] = useState(4);

  const r = useMemo(() => {
    const credits = enquiries * perEnquiry;
    // Smallest pack that covers about three months of use, so nobody is topping up every week.
    const pack = PACKS.find(p => p.credits >= credits * 3) ?? PACKS[PACKS.length - 1];
    const monthly = credits * pack.rate;
    const months = pack.credits / Math.max(credits, 1);
    return { credits, pack, monthly, perLead: perEnquiry * pack.rate, months };
  }, [enquiries, perEnquiry]);

  const level = LEVELS.find(x => x.v === perEnquiry)!;

  return (
    <div className="grid gap-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-[1fr_1.1fr]">
      {/* Inputs */}
      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <label htmlFor="enq" className="text-sm font-semibold text-foreground">New enquiries you get in a month</label>
            <span className="text-2xl font-bold tabular-nums text-[#2E0B63]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {enquiries.toLocaleString('en-IN')}
            </span>
          </div>
          <Slider id="enq" min={10} max={1500} step={10} value={[enquiries]} onValueChange={v => setEnquiries(v[0])} aria-label="Enquiries per month" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>10</span><span>1,500</span></div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Automated messages per enquiry</p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Automated messages per enquiry">
            {LEVELS.map(o => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={perEnquiry === o.v}
                onClick={() => setPerEnquiry(o.v)}
                className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${
                  perEnquiry === o.v ? 'border-[#5F40B5] bg-[#ECE7FA] text-[#2E0B63]' : 'border-border hover:bg-muted'
                }`}
              >
                <span className="block text-lg font-bold tabular-nums">{o.v}</span>
                <span className="block text-[11px] font-semibold">{o.l}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{level.d}</p>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          1 credit = 1 automated reply or follow-up VaartaBot sends for you. There's no monthly fee, and credits never expire. Prices exclude GST.
        </p>
      </div>

      {/* Result */}
      <div className="site-band-dark flex flex-col justify-between gap-6 rounded-2xl p-6 text-sidebar-foreground">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Credits a month', value: r.credits.toLocaleString('en-IN'), color: '#2DB8C1' },
            { label: 'Cost per enquiry', value: inr(r.perLead), color: '#FBBF24' },
            { label: 'Cost a month', value: inr(r.monthly), color: '#A58CF0' },
            { label: 'In a quiet month', value: '₹0', color: '#7DD3FC' },
          ].map(t => (
            <div key={t.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-sidebar-muted">{t.label}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: t.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="text-sm text-sidebar-muted">Suggested pack</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {r.pack.name} <span className="text-lg font-medium text-sidebar-muted">· {inr(r.pack.price)}</span>
          </p>
          <p className="mt-1 text-sm text-sidebar-muted">
            {r.pack.credits.toLocaleString('en-IN')} credits
            {r.months >= 1
              ? `, lasts about ${Math.floor(r.months)} month${Math.floor(r.months) > 1 ? 's' : ''} at this pace.`
              : '. At this volume you would top up during the month.'}
          </p>
          <Link to="/register" className="mt-5 block">
            <Button className="w-full bg-[#2DB8C1] font-semibold text-[#0D0A1A] hover:bg-[#41C8C3]">Start with a free account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CostCalculator;
