// src/pages/Billing.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import {
  Wallet, ArrowUpRight, ArrowDownRight,
  Crown, Sparkles, MessageSquare, RefreshCw,
  Search, Filter, X, CheckCircle,
  Zap, Gift, CreditCard, ShieldCheck, Lock,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

declare global {
  interface Window { Cashfree: any; }
}

const creditPackages = [
  { id: 1, credits: 500,   label: 'Starter',    icon: Zap,       price: 999   },
  { id: 2, credits: 2000,  label: 'Basic',       icon: MessageSquare, price: 3499  },
  { id: 3, credits: 5000,  label: 'Growth',      icon: Crown,     price: 8499,  popular: true },
  { id: 4, credits: 15000, label: 'Pro',         icon: Gift,      price: 23999 },
  { id: 5, credits: 30000, label: 'Enterprise',  icon: Sparkles,  price: 44999 },
];

const loadCashfreeSDK = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });

const Billing: React.FC = () => {
  const { tenant, transactions, dashboardStats } = useTenant();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{ credits: number; orderId: string } | null>(null);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [liveTransactions, setLiveTransactions] = useState<any[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => { loadCashfreeSDK().catch(console.error); }, []);

  const refreshBilling = async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [balRes, txRes] = await Promise.all([
        api.get('/api/tenant'),
        api.get('/api/payments/history'),
      ]);
      if (balRes.data?.success) setLiveBalance(balRes.data.data.credits_balance);
      if (txRes.data?.success) setLiveTransactions(txRes.data.data);
    } catch (err) {
      console.error('[Billing] refreshBilling failed:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => { refreshBilling(); }, []);

  const handlePayNow = async () => {
    if (!selectedPackage) { toast.error('Please select a credit package'); return; }
    const pkg = creditPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    setIsProcessing(true);

    try {
      const { data } = await api.post('/api/payments/create-order', { packageId: pkg.id });
      if (!data.success) throw new Error(data.error || 'Order creation failed');

      const { paymentSessionId, orderId } = data;

      await loadCashfreeSDK();

      // ✅ Close Dialog BEFORE opening Cashfree modal
      setIsPaymentOpen(false);

      // Small delay to let Dialog unmount fully
      await new Promise(resolve => setTimeout(resolve, 350));

      const cashfree = window.Cashfree({
        mode: import.meta.env.VITE_CASHFREE_ENV === 'TEST' ? 'sandbox' : 'production',
      });

      const checkoutPromise = cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10 * 60 * 1000)
      );

      let result: any;
      try {
        result = await Promise.race([checkoutPromise, timeoutPromise]);
      } catch (err: any) {
        toast.error(err.message === 'timeout' ? 'Payment session expired.' : 'Payment was cancelled.');
        setIsProcessing(false);
        return;
      }

      if (result?.error) {
        toast.error(result.error.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (result?.redirect) return;

      // Verify
      const verifyRes = await api.post('/api/payments/verify', { orderId });
      if (verifyRes.data?.success) {
        toast.success(`🎉 ${pkg.credits.toLocaleString()} credits added!`);
        await refreshBilling();
        // Re-open dialog to show success state
        setPaymentSuccess({ credits: pkg.credits, orderId });
        setIsPaymentOpen(true);
      } else {
        toast.error('Verification failed. Contact support.');
      }

    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment initiation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (isProcessing) return;
    setIsPaymentOpen(open);
    if (!open) {
      setTimeout(() => {
        setSelectedPackage(null);
        setPaymentSuccess(null);
      }, 300);
    }
  };

  const allTransactions = liveTransactions ?? transactions;

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return allTransactions.filter((txn) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !txn.description?.toLowerCase().includes(q) &&
          !txn.type?.toLowerCase().includes(q) &&
          !txn.transaction_ref?.toLowerCase().includes(q)
        ) return false;
      }
      if (filterType !== 'all' && txn.type !== filterType) return false;
      if (filterStatus !== 'all' && txn.status !== filterStatus) return false;
      if (filterPeriod !== 'all') {
        const txnDate = new Date(txn.created_at ?? txn.date);
        if (!isNaN(txnDate.getTime())) {
          const diffDays = (now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24);
          if (filterPeriod === '7d' && diffDays > 7) return false;
          if (filterPeriod === '30d' && diffDays > 30) return false;
          if (filterPeriod === '90d' && diffDays > 90) return false;
        }
      }
      return true;
    });
  }, [allTransactions, searchQuery, filterType, filterStatus, filterPeriod]);

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterPeriod !== 'all';
  const clearFilters = () => { setSearchQuery(''); setFilterType('all'); setFilterStatus('all'); setFilterPeriod('all'); };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'credit': return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'usage':
      case 'debit': return <ArrowDownRight className="w-4 h-4 text-yellow-500" />;
      case 'refund': return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      case 'subscription': return <Crown className="w-4 h-4 text-purple-500" />;
      default: return <Wallet className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const currentBalance = liveBalance ?? dashboardStats?.credits ?? 0;
  const selectedPkg = creditPackages.find(p => p.id === selectedPackage);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Billing & Credits</h1>
          <p className="text-muted-foreground mt-1">Manage your message credits and transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refreshBilling(false)} disabled={isRefreshing} title="Refresh balance">
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>

          {/* ── Buy Credits Dialog ── */}
          <Dialog open={isPaymentOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                <CreditCard className="w-4 h-4 mr-2" /> Buy Credits
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl p-0 overflow-hidden">
              <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
                <DialogTitle className="text-sm font-semibold text-foreground">Buy Message Credits</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Instant delivery · Secure payment via Cashfree</p>
              </DialogHeader>

              {/* Success state */}
              {paymentSuccess ? (
                <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Payment Successful! 🎉</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      <span className="font-semibold text-foreground">{paymentSuccess.credits.toLocaleString()} credits</span>{' '}
                      have been added to your account instantly.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Order ID: <span className="font-mono">{paymentSuccess.orderId}</span>
                    </p>
                  </div>
                  <Button
                    className="mt-2 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                    onClick={() => handleDialogClose(false)}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 space-y-2.5 overflow-y-auto max-h-[60vh]">
                    {/* Package list */}
                    <div className="space-y-2">
                      {creditPackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackage(pkg.id)}
                          className={cn(
                            'relative w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all focus:outline-none',
                            selectedPackage === pkg.id
                              ? 'border-tenant-accent bg-tenant-accent/5'
                              : 'border-border hover:border-tenant-accent/50 bg-card'
                          )}
                        >
                          {pkg.popular && (
                            <span className="absolute -top-2 left-3 px-1.5 py-0.5 bg-tenant-accent text-tenant-accent-foreground text-[9px] font-bold rounded-full">
                              POPULAR
                            </span>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <pkg.icon className="w-3.5 h-3.5 text-tenant-accent" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground leading-tight">{pkg.credits.toLocaleString()} credits</p>
                                <p className="text-[11px] text-muted-foreground">{pkg.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className="text-sm font-bold text-foreground">₹{pkg.price.toLocaleString()}</p>
                              <div className={cn(
                                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                selectedPackage === pkg.id ? 'bg-tenant-accent border-tenant-accent' : 'border-border bg-background'
                              )}>
                                {selectedPackage === pkg.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="w-3 h-3" /> Secure Payment</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="w-3 h-3" /> Cashfree Encrypted</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Zap className="w-3 h-3" /> Instant Credits</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-border bg-muted/30">
                    {selectedPkg && (
                      <div className="flex items-center justify-between mb-2.5 text-xs bg-card border border-border rounded-lg px-3 py-2">
                        <span className="text-muted-foreground">{selectedPkg.credits.toLocaleString()} credits · {selectedPkg.label}</span>
                        <span className="font-bold text-foreground text-sm">₹{selectedPkg.price.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-10 text-sm" onClick={() => handleDialogClose(false)} disabled={isProcessing}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-10 text-sm bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground font-semibold"
                        disabled={!selectedPackage || isProcessing}
                        onClick={handlePayNow}
                      >
                        {isProcessing
                          ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...</>
                          : <><CreditCard className="w-3.5 h-3.5 mr-1.5" /> Pay ₹{selectedPkg?.price.toLocaleString() ?? '—'}</>
                        }
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">UPI · Cards · Net Banking · Wallets supported</p>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* ── Balance Card ── */}
      <motion.div variants={itemVariants} className="rounded-2xl bg-tenant-accent p-6 md:p-8 text-tenant-accent-foreground">
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
              <span>{currentBalance.toLocaleString()} messages remaining</span>
            </div>
            <p className="opacity-60 text-xs mt-1">{tenant?.name} · {tenant?.industry}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs opacity-80 mb-1">Messages Sent</p>
              <p className="text-2xl font-bold">{dashboardStats?.messagesSent?.toLocaleString() ?? 0}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs opacity-80 mb-1">This Month</p>
              <p className="text-2xl font-bold">{dashboardStats?.messagesSent?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Info Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: '1 Credit = 1 Message', body: 'Every WhatsApp message sent deducts exactly 1 credit.' },
          { title: 'Credits Never Expire', body: 'Credits stay in your account indefinitely. No monthly burn pressure.' },
          { title: 'Instant Top-Up', body: 'Pay online via UPI, card, or net banking. Credits added instantly after payment.' },
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
          <span className="text-xs text-muted-foreground">
            {filteredTransactions.length} of {allTransactions.length} transaction{allTransactions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-full sm:w-36 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-full sm:w-36 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="h-9 w-full sm:w-36 text-sm">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3 text-muted-foreground hover:text-foreground whitespace-nowrap">
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Transaction', 'Date', 'Credits', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Wallet className="w-10 h-10 mx-auto mb-3 opacity-25" />
                      <p className="text-sm font-medium">{hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}</p>
                      <p className="text-xs mt-1">
                        {hasActiveFilters
                          ? <button onClick={clearFilters} className="text-tenant-accent underline">Clear filters</button>
                          : 'Buy credits to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(txn.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground capitalize">{txn.type}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{txn.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {txn.created_at || txn.date
                          ? new Date(txn.created_at ?? txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {txn.credits > 0
                          ? <span className="text-green-600">+{txn.credits.toLocaleString()}</span>
                          : txn.credits < 0
                            ? <span className="text-muted-foreground">{txn.credits.toLocaleString()}</span>
                            : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        ₹{Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium rounded-full px-2.5 py-1 capitalize', getStatusBadge(txn.status))}>
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