import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Plus, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Gift,
  Crown,
  Check,
  Sparkles
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const creditPackages = [
  { 
    id: 1, 
    credits: 1000, 
    price: 299, 
    popular: false, 
    icon: Zap,
    pricePerK: 0.299,
    description: 'Perfect for small businesses'
  },
  { 
    id: 2, 
    credits: 5000, 
    price: 1299, 
    popular: true, 
    icon: Crown,
    pricePerK: 0.260,
    savings: 13,
    description: 'Most popular for growing businesses'
  },
  { 
    id: 3, 
    credits: 10000, 
    price: 2399, 
    popular: false, 
    icon: Gift,
    pricePerK: 0.240,
    savings: 20,
    description: 'Best value for businesses'
  },
  { 
    id: 4, 
    credits: 25000, 
    price: 5499, 
    popular: false, 
    icon: Sparkles,
    pricePerK: 0.220,
    savings: 27,
    description: 'Maximum savings for high volume'
  }
];

const subscriptionPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1499,
    priceYearly: 14990,
    conversations: 1000,
    users: 3,
    popular: false,
    features: [
      'Basic chatbot flows',
      'Broadcast campaigns',
      'WhatsApp Green Tick support',
      '1,000 free conversations/month',
      'Email support',
      'Campaign analytics',
      'Contact management'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 2999,
    priceYearly: 29990,
    conversations: 5000,
    users: 10,
    popular: true,
    features: [
      'Advanced chatbot automation',
      'AI-powered responses',
      'CRM integration (Zoho, HubSpot, Salesforce)',
      '5,000 free conversations/month',
      'API access',
      'Advanced analytics & reports',
      'Chat assignment & routing',
      'Priority support'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: 7999,
    priceYearly: 79990,
    conversations: 20000,
    users: 'Unlimited',
    popular: false,
    features: [
      'Multi-agent support',
      'Custom chatbot workflows',
      'Advanced AI with NLP',
      '20,000 free conversations/month',
      'Custom integrations',
      'Dedicated account manager',
      'White-label options',
      '24/7 priority support',
      'Custom reporting & dashboards'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceYearly: 'Custom',
    conversations: 'Unlimited',
    users: 'Unlimited',
    custom: true,
    features: [
      'Custom AI models',
      'Enterprise-grade security',
      'Custom SLA agreements',
      'Volume-based discounts',
      'Dedicated infrastructure',
      'On-premise deployment options',
      '24/7 dedicated support team',
      'Training & onboarding',
      'Custom integrations & workflows'
    ]
  }
];

const Billing: React.FC = () => {
  const { tenant, transactions, dashboardStats } = useTenant();
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'credits' | 'subscription'>('credits');

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCreditPurchase = async () => {
    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        return;
      }

      const orderResponse = await axios.post('/api/payments/create-order', {
        packageId: selectedPackage
      });

      const { orderId, amount, currency, keyId, packageInfo } = orderResponse.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'VentureBot',
        description: `Purchase ${packageInfo.credits.toLocaleString()} Credits`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await axios.post('/api/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.data.success) {
              toast.success(`${verifyResponse.data.creditsAdded.toLocaleString()} credits added successfully!`);
              setIsPurchaseOpen(false);
              setSelectedPackage(null);
              window.location.reload();
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.response?.data?.error || 'Payment verification failed');
          }
        },
        prefill: {
          name: tenant?.name || '',
          email: tenant?.email || '',
          contact: tenant?.phone || ''
        },
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscriptionPurchase = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    const plan = subscriptionPlans.find(p => p.id === selectedPlan);
    if (plan?.custom) {
      toast.info('Please contact sales for Enterprise plan');
      return;
    }

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        return;
      }

      const orderResponse = await axios.post('/api/payments/create-subscription-order', {
        planId: selectedPlan,
        billingCycle: billingCycle
      });

      const { orderId, amount, currency, keyId, planInfo } = orderResponse.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'VentureBot',
        description: `${planInfo.name} Plan - ${billingCycle}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await axios.post('/api/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.data.success) {
              toast.success(`${planInfo.name} plan activated successfully!`);
              setIsPurchaseOpen(false);
              setSelectedPlan(null);
              window.location.reload();
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.response?.data?.error || 'Payment verification failed');
          }
        },
        prefill: {
          name: tenant?.name || '',
          email: tenant?.email || '',
          contact: tenant?.phone || ''
        },
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ArrowUpRight className="w-4 h-4 text-success" />;
      case 'usage': return <ArrowDownRight className="w-4 h-4 text-warning" />;
      case 'refund': return <ArrowUpRight className="w-4 h-4 text-chart-3" />;
      case 'subscription': return <Crown className="w-4 h-4 text-blue-600" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'status-success';
      case 'pending': return 'status-warning';
      case 'failed': return 'status-error';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Billing & Credits</h1>
          <p className="text-muted-foreground mt-1">
            Manage your credits, subscriptions, and transactions
          </p>
        </div>
        <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit">
              <Plus className="w-4 h-4 mr-2" />
              Buy Credits / Subscribe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose Your Plan</DialogTitle>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="credits">Pay As You Go</TabsTrigger>
                <TabsTrigger value="subscription">Monthly Plans</TabsTrigger>
              </TabsList>
              
              {/* Credit Packages Tab */}
              <TabsContent value="credits" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Purchase message credits as needed. No monthly commitment.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {creditPackages.map((pkg) => (
                    <motion.div
                      key={pkg.id}
                      className={cn(
                        "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
                        selectedPackage === pkg.id 
                          ? "border-tenant-accent bg-tenant-accent/5" 
                          : "border-border hover:border-tenant-accent/50"
                      )}
                      onClick={() => setSelectedPackage(pkg.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-tenant-accent text-white text-xs font-medium rounded-full">
                          Most Popular
                        </span>
                      )}
                      {pkg.savings && (
                        <span className="absolute -top-3 right-4 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                          Save {pkg.savings}%
                        </span>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <pkg.icon className="w-5 h-5 text-tenant-accent" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{pkg.credits.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">credits</p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-bold text-foreground">₹{pkg.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ₹{pkg.pricePerK.toFixed(3)} per credit
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pkg.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-tenant-accent hover:bg-tenant-accent/90 text-white"
                    disabled={!selectedPackage || isProcessing}
                    onClick={handleCreditPurchase}
                  >
                    {isProcessing ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </div>
              </TabsContent>

              {/* Subscription Plans Tab */}
              <TabsContent value="subscription" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Get platform features + free conversations every month
                  </p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                    <button
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-md transition-colors",
                        billingCycle === 'monthly' 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setBillingCycle('monthly')}
                    >
                      Monthly
                    </button>
                    <button
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-md transition-colors",
                        billingCycle === 'yearly' 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setBillingCycle('yearly')}
                    >
                      Yearly <span className="text-green-600 ml-1">(Save 17%)</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {subscriptionPlans.map((plan) => (
                    <motion.div
                      key={plan.id}
                      className={cn(
                        "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
                        selectedPlan === plan.id 
                          ? "border-tenant-accent bg-tenant-accent/5" 
                          : "border-border hover:border-tenant-accent/50",
                        plan.popular && "border-tenant-accent"
                      )}
                      onClick={() => !plan.custom && setSelectedPlan(plan.id)}
                      whileHover={{ scale: plan.custom ? 1 : 1.02 }}
                      whileTap={{ scale: plan.custom ? 1 : 0.98 }}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-tenant-accent text-white text-xs font-medium rounded-full">
                          Most Popular
                        </span>
                      )}
                      
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                          {plan.custom ? (
                            <span className="text-2xl font-bold text-foreground">Custom</span>
                          ) : (
                            <>
                              <span className="text-2xl font-bold text-foreground">
                                ₹{billingCycle === 'yearly' 
                                  ? (plan.priceYearly / 12).toFixed(0)
                                  : plan.price}
                              </span>
                              <span className="text-muted-foreground text-sm">/month</span>
                            </>
                          )}
                        </div>
                        {!plan.custom && billingCycle === 'yearly' && (
                          <p className="text-xs text-green-600">
                            Billed ₹{plan.priceYearly} annually
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-foreground">
                            {typeof plan.conversations === 'number' 
                              ? `${plan.conversations.toLocaleString()} conversations/month`
                              : 'Unlimited conversations'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-foreground">
                            {typeof plan.users === 'number' 
                              ? `Up to ${plan.users} users`
                              : 'Unlimited users'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Key Features:</p>
                        <ul className="space-y-1.5">
                          {plan.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check className="w-3 h-3 text-tenant-accent mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-xs text-tenant-accent font-medium">
                              +{plan.features.length - 4} more features
                            </li>
                          )}
                        </ul>
                      </div>

                      {plan.custom && (
                        <Button 
                          variant="outline" 
                          className="w-full mt-4"
                          onClick={() => toast.info('Please contact sales@venturebot.com')}
                        >
                          Contact Sales
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-tenant-accent hover:bg-tenant-accent/90 text-white"
                    disabled={!selectedPlan || isProcessing}
                    onClick={handleSubscriptionPurchase}
                  >
                    {isProcessing ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Credit Balance Card */}
      <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Current Balance</p>
                <p className="text-3xl md:text-4xl font-bold">
                  {dashboardStats?.credits?.toLocaleString() || '0'}
                  <span className="text-lg font-normal text-white/80 ml-2">credits</span>
                </p>
              </div>
            </div>
            <p className="text-white/80">
              {tenant?.name} • {tenant?.industry}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/80 text-sm mb-1">Messages Sent</p>
              <p className="text-2xl font-bold">{dashboardStats?.messagesSent?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/80 text-sm mb-1">This Month</p>
              <p className="text-2xl font-bold">{dashboardStats?.messagesSent?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Info Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">No Setup Fees</h3>
          <p className="text-foreground text-sm">Save ₹1,000-₹3,000 compared to competitors</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Transparent Pricing</h3>
          <p className="text-foreground text-sm">No markup on Meta WhatsApp charges</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Cancel Anytime</h3>
          <p className="text-foreground text-sm">No long-term contracts required</p>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Transaction History</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Credits</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                            {getTransactionIcon(txn.type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground capitalize">{txn.type}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {txn.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        {txn.credits > 0 ? (
                          <span className="font-medium text-green-600">
                            +{txn.credits.toLocaleString()}
                          </span>
                        ) : txn.credits < 0 ? (
                          <span className="font-medium text-muted-foreground">
                            {txn.credits.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="font-medium text-foreground">
                        ₹{Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={cn('status-badge capitalize', getStatusBadge(txn.status))}>
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