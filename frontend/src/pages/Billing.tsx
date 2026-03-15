import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Plus, Wallet, ArrowUpRight, ArrowDownRight,
  Zap, Gift, Crown, Check, Sparkles,
  MessageSquare, RefreshCw, Info,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

declare global {
  interface Window { Razorpay: any; }
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
// Meta India cost: Marketing ₹1.09 · Utility ₹0.145 · Service free
// Blended avg (40% mktg + 60% util) ≈ ₹0.52/msg → our price gives ~2x margin

const creditPackages = [
  {
    id: 1,
    credits: 500,
    price: 499,
    pricePerCredit: 0.998,
    savings: null,
    popular: false,
    label: 'Starter',
    icon: Zap,
    description: 'Try it out — no big commitment',
  },
  {
    id: 2,
    credits: 2000,
    price: 1599,
    pricePerCredit: 0.80,
    savings: 20,
    popular: false,
    label: 'Basic',
    icon: MessageSquare,
    description: 'Great for small campaigns',
  },
  {
    id: 3,
    credits: 5000,
    price: 3499,
    pricePerCredit: 0.70,
    savings: 30,
    popular: true,
    label: 'Growth',
    icon: Crown,
    description: 'Best for growing businesses',
  },
  {
    id: 4,
    credits: 15000,
    price: 8999,
    pricePerCredit: 0.60,
    savings: 40,
    popular: false,
    label: 'Pro',
    icon: Gift,
    description: 'High volume at great value',
  },
  {
    id: 5,
    credits: 30000,
    price: 15999,
    pricePerCredit: 0.533,
    savings: 47,
    popular: false,
    label: 'Enterprise',
    icon: Sparkles,
    description: 'Maximum volume, best price',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Billing: React.FC = () => {
  const { tenant, transactions, dashboardStats } = useTenant();

  const [isPurchaseOpen, setIsPurchaseOpen]   = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isProcessing, setIsProcessing]       = useState(false);

  // ─── Razorpay ──────────────────────────────────────────────────────────────

  const loadRazorpay = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleCreditPurchase = async () => {
  if (!selectedPackage) { toast.error('Please select a package'); return; }
  setIsProcessing(true);

  try {
    const { data } = await axios.post('/api/payments/test-purchase', {
      packageId: selectedPackage,
    });

    if (data.success) {
      toast.success(`${data.creditsAdded.toLocaleString()} credits added! 🎉`);
      setIsPurchaseOpen(false);
      setSelectedPackage(null);
      window.location.reload();
    }
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to add credits');
  } finally {
    setIsProcessing(false);
  }
};

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':     return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'usage':        return <ArrowDownRight className="w-4 h-4 text-yellow-500" />;
      case 'refund':       return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      case 'subscription': return <Crown className="w-4 h-4 text-purple-500" />;
      default:             return <Wallet className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending':   return 'bg-yellow-100 text-yellow-700';
      case 'failed':    return 'bg-red-100 text-red-700';
      default:          return 'bg-muted text-muted-foreground';
    }
  };

  const selectedPkg    = creditPackages.find(p => p.id === selectedPackage);
  const currentBalance = dashboardStats?.credits ?? 0;

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >

      {/* ── Page Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Billing & Credits</h1>
          <p className="text-muted-foreground mt-1">
            Manage your message credits and transaction history
          </p>
        </div>

        {/* ── Buy Credits Dialog ── */}
        <Dialog
          open={isPurchaseOpen}
          onOpenChange={(open) => {
            setIsPurchaseOpen(open);
            if (!open) setSelectedPackage(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit">
              <Plus className="w-4 h-4 mr-2" />
              Buy Credits
            </Button>
          </DialogTrigger>

          {/* ── Dialog Box ── */}
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-2xl p-0 overflow-hidden">

            {/* Dialog Header */}
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
              <DialogTitle className="text-base font-semibold text-foreground">
                Buy Message Credits
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                1 credit = 1 WhatsApp message · Credits never expire
              </p>
            </DialogHeader>

            {/* Dialog Body */}
            <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">

              {/* Meta cost info */}
              <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 border border-border">
                <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Meta India rates (Jan 2026) —{' '}
                  <span className="text-foreground font-medium">Marketing ₹1.09</span> ·{' '}
                  <span className="text-foreground font-medium">Utility ₹0.145</span> ·{' '}
                  <span className="text-foreground font-medium">Service Free</span>
                </p>
              </div>

              {/* Package list */}
              <div className="space-y-2">
                {creditPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={cn(
                      'relative w-full text-left rounded-xl border-2 px-4 py-3 transition-all focus:outline-none',
                      selectedPackage === pkg.id
                        ? 'border-tenant-accent bg-tenant-accent/5'
                        : 'border-border hover:border-tenant-accent/50 bg-card'
                    )}
                  >
                    {/* Popular badge */}
                    {pkg.popular && (
                      <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-tenant-accent text-tenant-accent-foreground text-[10px] font-bold rounded-full">
                        MOST POPULAR
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      {/* Left — icon + label + credits */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <pkg.icon className="w-4 h-4 text-tenant-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {pkg.credits.toLocaleString()} credits
                            </p>
                            {pkg.savings && (
                              <span className="text-[10px] font-bold text-green-600 bg-green-100 rounded-full px-1.5 py-0.5">
                                -{pkg.savings}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            ₹{pkg.pricePerCredit.toFixed(2)}/msg · {pkg.description}
                          </p>
                        </div>
                      </div>

                      {/* Right — price + check */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-base font-bold text-foreground">₹{pkg.price}</p>
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                          selectedPackage === pkg.id
                            ? 'bg-tenant-accent border-tenant-accent'
                            : 'border-border bg-background'
                        )}>
                          {selectedPackage === pkg.id && (
                            <Check className="w-2.5 h-2.5 text-tenant-accent-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-5 py-4 border-t border-border bg-muted/30">
              {/* Summary */}
              {selectedPkg ? (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-tenant-accent" />
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{selectedPkg.credits.toLocaleString()}</span> messages
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">Total: ₹{selectedPkg.price}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">
                  Select a package above to continue
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsPurchaseOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                  disabled={!selectedPackage || isProcessing}
                  onClick={handleCreditPurchase}
                >
                  {isProcessing ? (
                    <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...</>
                  ) : (
                    'Pay Now'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* ── Balance Card ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl bg-tenant-accent p-6 md:p-8 text-tenant-accent-foreground"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm opacity-80">Current Balance</p>
                <p className="text-3xl font-bold">
                  {currentBalance.toLocaleString()}
                  <span className="text-base font-normal opacity-80 ml-2">credits</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-80 text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>{currentBalance.toLocaleString()} promotional messages remaining</span>
            </div>
            <p className="opacity-60 text-xs mt-1">{tenant?.name} · {tenant?.industry}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs opacity-80 mb-1">Messages Sent</p>
              <p className="text-2xl font-bold">
                {dashboardStats?.messagesSent?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs opacity-80 mb-1">This Month</p>
              <p className="text-2xl font-bold">
                {dashboardStats?.messagesSent?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Info Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: '1 Credit = 1 Message',
            body: 'Every WhatsApp message sent deducts exactly 1 credit — marketing, utility or auth.',
          },
          {
            title: 'Credits Never Expire',
            body: 'Purchased credits stay in your account indefinitely. No monthly burn pressure.',
          },
          {
            title: 'Transparent Pricing',
            body: 'No hidden fees. You pay for what you send, nothing more.',
          },
        ].map(({ title, body }) => (
          <div key={title} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-tenant-accent" />
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Transaction History ── */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Transaction History</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Transaction', 'Date', 'Credits', 'Amount', 'Status'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Wallet className="w-10 h-10 mx-auto mb-3 opacity-25" />
                      <p className="text-sm font-medium">No transactions yet</p>
                      <p className="text-xs mt-1">Purchase credits to get started</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-t border-border hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(txn.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground capitalize">{txn.type}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {txn.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(txn.date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {txn.credits > 0 ? (
                          <span className="text-green-600">+{txn.credits.toLocaleString()}</span>
                        ) : txn.credits < 0 ? (
                          <span className="text-muted-foreground">{txn.credits.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        ₹{Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-medium rounded-full px-2.5 py-1 capitalize',
                          getStatusBadge(txn.status)
                        )}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
};

export default Billing;
