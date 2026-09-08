import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '17-04-2026 20:00:56';

const SECTIONS = [
  {
    title: '1. Cancellation Policy',
    body: `Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.`,
  },
  {
    title: '2. Non-Cancellable Items',
    body: `NACHIKETH M DESAI does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.`,
  },
  {
    title: '3. Damaged or Defective Items',
    body: `In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within the same day of receipt of the products.`,
  },
  {
    title: '4. Product Not as Described',
    body: `In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within the same day of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.`,
  },
  {
    title: '5. Warranty Issues',
    body: `In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them.`,
  },
  {
    title: '6. Refund Processing',
    body: `In case of any refunds approved by NACHIKETH M DESAI, it will take 6–8 business days for the refund to be processed to the end customer.`,
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
            NACHIKETH M DESAI believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. The following terms apply to all cancellation and refund requests.
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
          <p className="text-sm font-semibold text-foreground mb-1">Refund timeline</p>
          <p className="text-sm text-muted-foreground">
            Approved refunds are processed within <span className="text-foreground font-semibold">6–8 business days</span> back to your original payment method.
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
