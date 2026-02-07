import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Plus, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Gift,
  Crown
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
import { cn } from '@/lib/utils';

const creditPackages = [
  { id: 1, credits: 1000, price: 29, popular: false, icon: Zap },
  { id: 2, credits: 5000, price: 99, popular: true, icon: Crown },
  { id: 3, credits: 10000, price: 179, popular: false, icon: Gift },
  { id: 4, credits: 25000, price: 399, popular: false, icon: Crown }
];

const Billing: React.FC = () => {
  const { tenant, transactions, dashboardStats } = useTenant();
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ArrowUpRight className="w-4 h-4 text-success" />;
      case 'usage': return <ArrowDownRight className="w-4 h-4 text-warning" />;
      case 'refund': return <ArrowUpRight className="w-4 h-4 text-chart-3" />;
      default: return <CreditCard className="w-4 h-4" />;
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
            Manage your message credits and transactions
          </p>
        </div>
        <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit">
              <Plus className="w-4 h-4 mr-2" />
              Buy Credits
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Purchase Credits</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {creditPackages.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  className={cn(
                    "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
                    selectedPackage === pkg.id 
                      ? "border-tenant-accent bg-tenant-accent-light" 
                      : "border-border hover:border-tenant-accent/50"
                  )}
                  onClick={() => setSelectedPackage(pkg.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-tenant-accent text-tenant-accent-foreground text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <pkg.icon className="w-5 h-5 tenant-accent-text" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{pkg.credits.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">credits</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
                    <span className="text-sm text-muted-foreground">USD</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    ${(pkg.price / pkg.credits * 1000).toFixed(2)} per 1,000 messages
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                disabled={!selectedPackage}
              >
                Purchase Credits
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Credit Balance Card */}
      <motion.div variants={itemVariants} className="bg-gradient-to-br from-sidebar to-sidebar-accent rounded-2xl p-8 text-sidebar-foreground">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-sidebar-accent flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sidebar-muted text-sm">Current Balance</p>
                <p className="text-3xl md:text-4xl font-bold">
                  {dashboardStats?.credits?.toLocaleString() || '0'}
                  <span className="text-lg font-normal text-sidebar-muted ml-2">credits</span>
                </p>
              </div>
            </div>
            <p className="text-sidebar-muted">
              {tenant?.name} • {tenant?.industry}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-sidebar-accent/50 rounded-xl p-4">
              <p className="text-sidebar-muted text-sm mb-1">Messages Sent</p>
              <p className="text-2xl font-bold">{dashboardStats?.messagesSent?.toLocaleString()}</p>
            </div>
            <div className="bg-sidebar-accent/50 rounded-xl p-4">
              <p className="text-sidebar-muted text-sm mb-1">Active Campaigns</p>
              <p className="text-2xl font-bold">{dashboardStats?.activeActiveCampaigns}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Credit Packages */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Credit Packages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {creditPackages.map((pkg) => (
            <motion.div
              key={pkg.id}
              className={cn(
                "relative bg-card rounded-xl border border-border p-5 hover:border-tenant-accent/50 transition-all cursor-pointer",
                pkg.popular && "border-tenant-accent"
              )}
              whileHover={{ y: -4 }}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-tenant-accent text-tenant-accent-foreground text-xs font-medium rounded-full">
                  Popular
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-tenant-accent-light flex items-center justify-center">
                  <pkg.icon className="w-5 h-5 tenant-accent-text" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{pkg.credits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
              </div>
              <Button 
                variant={pkg.popular ? "default" : "outline"} 
                className={cn(
                  "w-full",
                  pkg.popular && "bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                )}
                onClick={() => {
                  setSelectedPackage(pkg.id);
                  setIsPurchaseOpen(true);
                }}
              >
                Purchase
              </Button>
            </motion.div>
          ))}
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
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                          {getTransactionIcon(txn.type)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground capitalize">{txn.type}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {txn.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={cn(
                        "font-medium",
                        txn.credits > 0 ? "text-success" : "text-foreground"
                      )}>
                        {txn.credits > 0 ? '+' : ''}{txn.credits.toLocaleString()}
                      </span>
                    </td>
                    <td className="font-medium text-foreground">
                      {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className={cn('status-badge capitalize', getStatusBadge(txn.status))}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Billing;
