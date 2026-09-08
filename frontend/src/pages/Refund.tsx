import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '08-09-2026';

const SECTIONS = [
  {
    title: '1. Nature of Service',
    body: `VaartaBot is a digital software-as-a-service (SaaS) platform. All purchases on VaartaBot are for prepaid messaging credits or AI token packs ("Credits") that are consumed electronically. Because Credits are digital goods delivered immediately upon purchase, they are generally non-refundable once allocated to your account.`,
  },
  {
    title: '2. Cancellation Before Credit Allocation',
    body: `If you have placed an order and the payment is captured but Credits have not yet been allocated to your account due to a technical error on our side, you may request a cancellation within 24 hours of the transaction by contacting our support team. We will review the request and, if confirmed, cancel the order and initiate a full refund.`,
  },
  {
    title: '3. Non-Refundable Credits',
    body: `Once Credits are successfully allocated to your VaartaBot account, they are non-refundable. This applies regardless of whether the Credits have been partially or fully consumed. Credits do not expire and remain available in your account for future use.`,
  },
  {
    title: '4. Service Unavailability',
    body: `If VaartaBot experiences a platform outage lasting more than 24 continuous hours that prevents you from using your allocated Credits, you may be eligible for a pro-rata credit extension or partial refund at our discretion. Such claims must be raised within 7 days of the incident by writing to support@vaartabot.in with your account details and order reference.`,
  },
  {
    title: '5. Duplicate or Erroneous Transactions',
    body: `If you are charged more than once for the same order, or if a technical error results in an incorrect charge, please contact us immediately at support@vaartabot.in. We will investigate and, if a duplicate or erroneous charge is confirmed, process a full refund for the extra amount within 6–8 business days.`,
  },
  {
    title: '6. Refund Processing',
    body: `All approved refunds are processed back to the original payment method used at the time of purchase. Refunds typically reflect within 6–8 business days, depending on your bank or card issuer. VaartaBot is not responsible for delays caused by your financial institution.`,
  },
  {
    title: '7. How to Raise a Refund Request',
    body: `To raise a refund or cancellation request, email support@vaartabot.in with the subject line "Refund Request — [Order ID]" and include your registered email address, the transaction date, and the reason for your request. Our team will acknowledge your request within 2 business days and provide a resolution within 7 business days.`,
  },
];

const Refund: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground">

    {/* Nav */}
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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

    {/* Body */}
    <main className="max-w-4xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-foreground mb-3">Cancellation &amp; Refund Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated on: {LAST_UPDATED}</p>
          <p className="text-muted-foreground mt-4 leading-relaxed max-w-2xl">
            VaartaBot sells prepaid digital messaging credits. The following policy applies to all purchases made on the VaartaBot platform. Please read it carefully before completing any transaction.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map(({ title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">{body}</p>
            </motion.div>
          ))}
        </div>

        {/* Highlight box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 bg-[hsl(var(--tenant-accent)/0.08)] border border-[hsl(var(--tenant-accent)/0.25)] rounded-2xl p-6"
        >
          <p className="text-sm font-semibold text-foreground mb-1">Key points</p>
          <p className="text-sm text-muted-foreground">
            Credits are <span className="text-foreground font-semibold">non-refundable once allocated</span>. Approved refunds for duplicate/erroneous charges are processed within <span className="text-foreground font-semibold">6–8 business days</span> to your original payment method.
          </p>
        </motion.div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Questions?{' '}
            <Link to="/contact" className="text-[hsl(var(--tenant-accent))] hover:underline">Contact us</Link>
            {' '}·{' '}
            <Link to="/terms" className="text-[hsl(var(--tenant-accent))] hover:underline">Terms of Service</Link>
            {' '}·{' '}
            <Link to="/privacy" className="text-[hsl(var(--tenant-accent))] hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </motion.div>
    </main>
  </div>
);

export default Refund;
