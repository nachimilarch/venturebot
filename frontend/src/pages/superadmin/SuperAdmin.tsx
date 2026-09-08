// src/pages/superadmin/SuperAdmin.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/superAdminAxios';
import {
    Wallet, MessageSquare, Building2, Search, Filter,
    RefreshCw, Plus, Check, X,
    Eye, EyeOff, Copy, AlertCircle, Crown,
    Phone, Mail, Globe, Calendar, MoreVertical, Send,
    CheckCircle, Clock, XCircle, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    industry: string | null;
    status: string | null;   // subscription_status from DB — can be null
    credits_balance: number;
    created_at: string;
    plan: string | null;   // subscription_plan — can be null
}

interface WhatsAppConfig {
    phone_number_id: string;
    business_account_id: string;
    access_token: string;
    webhook_verify_token: string;
    display_phone: string;
    status: string;
}

interface CreditRequest {
    id: number;
    tenant_id: number;
    tenant_name: string;
    tenant_email: string | null;
    credits: number;
    price: number;
    package_label: string;
    note: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface Transaction {
    id: number;
    tenant_id: number;
    type: string;
    credits: number;
    amount: number;
    description: string;
    status: string;
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusBadge = (status: string | null) => {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-700';
        case 'suspended': return 'bg-red-100 text-red-700';
        case 'trial': return 'bg-blue-100 text-blue-700';
        default: return 'bg-muted text-muted-foreground';
    }
};

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtDateShort = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
    icon: React.ReactNode; label: string; value: string | number;
    sub?: string; color?: string;
}> = ({ icon, label, value, sub, color = 'text-tenant-accent' }) => (
    <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <div className={cn('w-8 h-8 rounded-lg bg-muted flex items-center justify-center', color)}>
                {icon}
            </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdmin: React.FC = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('tenants');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // ── Tenant detail modal ───────────────────────────────────────────────────
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [tenantWAConfig, setTenantWAConfig] = useState<WhatsAppConfig | null>(null);
    const [tenantTxns, setTenantTxns] = useState<Transaction[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [showToken, setShowToken] = useState(false);

    // ── Credit disbursal ─────────────────────────────────────────────────────
    const [isDisbursalOpen, setIsDisbursalOpen] = useState(false);
    const [disbursalTenant, setDisbursalTenant] = useState<Tenant | null>(null);
    const [disbursalCredits, setDisbursalCredits] = useState('');
    const [disbursalAmount, setDisbursalAmount] = useState('');
    const [disbursalNote, setDisbursalNote] = useState('');
    const [isDisbursing, setIsDisbursing] = useState(false);

    // ── Fetch all data ────────────────────────────────────────────────────────

    const fetchAll = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);
        try {
            const [tenantsRes, reqRes, txnRes, statsRes] = await Promise.all([
                axios.get('/api/superadmin/tenants'),
                axios.get('/api/superadmin/credit-requests'),
                axios.get('/api/superadmin/transactions'),
                axios.get('/api/superadmin/stats'),
            ]);
            if (tenantsRes.data?.success) setTenants(tenantsRes.data.data);
            if (reqRes.data?.success) setCreditRequests(reqRes.data.data);
            if (txnRes.data?.success) setTransactions(txnRes.data.data);
            if (statsRes.data?.success) setStats(statsRes.data.data);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Logout ────────────────────────────────────────────────────────────────

    const handleLogout = () => {
        localStorage.removeItem('sa_token');
        localStorage.removeItem('sa_user');
        navigate('/superadmin/login');
    };

    // ── Open tenant detail ────────────────────────────────────────────────────

    const openTenantDetail = async (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setIsDetailOpen(true);
        setIsDetailLoading(true);
        setShowToken(false);
        setTenantWAConfig(null);
        setTenantTxns([]);
        try {
            const [waRes, txnRes] = await Promise.all([
                axios.get(`/api/superadmin/tenants/${tenant.id}/whatsapp`),
                axios.get(`/api/superadmin/tenants/${tenant.id}/transactions`),
            ]);
            if (waRes.data?.success) setTenantWAConfig(waRes.data.data);
            if (txnRes.data?.success) setTenantTxns(txnRes.data.data);
        } catch {
            toast.error('Failed to load tenant details');
        } finally {
            setIsDetailLoading(false);
        }
    };

    // ── Disburse credits ──────────────────────────────────────────────────────

    const openDisbursal = (tenant: Tenant, prefillCredits?: number, prefillAmount?: number) => {
        setDisbursalTenant(tenant);
        setDisbursalCredits(prefillCredits ? String(prefillCredits) : '');
        setDisbursalAmount(prefillAmount ? String(prefillAmount) : '');
        setDisbursalNote('');
        setIsDisbursalOpen(true);
    };

    const handleDisburse = async () => {
        if (!disbursalTenant || !disbursalCredits) { toast.error('Enter credit amount'); return; }
        setIsDisbursing(true);
        try {
            await axios.post(`/api/superadmin/tenants/${disbursalTenant.id}/disburse`, {
                credits: Number(disbursalCredits),
                amount: Number(disbursalAmount) || 0,
                note: disbursalNote.trim(),
            });
            toast.success(`✅ ${Number(disbursalCredits).toLocaleString()} credits added to ${disbursalTenant.name}`);
            setIsDisbursalOpen(false);
            fetchAll(true);
            if (selectedTenant?.id === disbursalTenant.id) openTenantDetail(disbursalTenant);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Disbursal failed');
        } finally {
            setIsDisbursing(false);
        }
    };

    // ── Approve / reject credit request ──────────────────────────────────────

    const handleRequestAction = async (req: CreditRequest, action: 'approved' | 'rejected') => {
        try {
            await axios.patch(`/api/superadmin/credit-requests/${req.id}`, { status: action });
            if (action === 'approved') {
                const tenant = tenants.find(t => t.id === req.tenant_id);
                if (tenant) openDisbursal(tenant, req.credits, req.price);
            }
            toast.success(`Request ${action}`);
            fetchAll(true);
        } catch {
            toast.error('Action failed');
        }
    };

    // ── Update tenant status ──────────────────────────────────────────────────

    const updateTenantStatus = async (tenantId: number, status: string) => {
        try {
            await axios.patch(`/api/superadmin/tenants/${tenantId}/status`, { status });
            toast.success('Status updated');
            fetchAll(true);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    // ── Filtered tenants ──────────────────────────────────────────────────────

    const filteredTenants = useMemo(() => tenants.filter(t => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !searchQuery ||
            t.name.toLowerCase().includes(q) ||
            (t.email ?? '').toLowerCase().includes(q) ||
            (t.phone ?? '').includes(searchQuery);
        const matchStatus = statusFilter === 'all' || (t.status ?? 'inactive') === statusFilter;
        return matchSearch && matchStatus;
    }), [tenants, searchQuery, statusFilter]);

    const pendingRequests = creditRequests.filter(r => r.status === 'pending');

    const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-7xl p-4 md:p-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Super Admin</h1>
                    </div>
                    <p className="text-muted-foreground text-sm">Manage all tenants, credits and billing</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={isRefreshing}>
                        <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                        <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
                    </Button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Building2 className="w-4 h-4" />} label="Total Tenants"
                    value={stats.totalTenants ?? tenants.length}
                    sub={`${tenants.filter(t => t.status === 'active').length} active`} />
                <StatCard icon={<Wallet className="w-4 h-4" />} label="Credits Issued"
                    value={Number(stats.totalCreditsIssued ?? 0).toLocaleString()}
                    sub="all time" color="text-green-600" />
                <StatCard icon={<MessageSquare className="w-4 h-4" />} label="Messages Sent"
                    value={Number(stats.totalMessagesSent ?? 0).toLocaleString()}
                    sub="all tenants" color="text-blue-600" />
                <StatCard icon={<AlertCircle className="w-4 h-4" />} label="Pending Requests"
                    value={stats.pendingRequests ?? pendingRequests.length}
                    sub="credit requests" color="text-yellow-600" />
            </div>

            {/* ── Pending Requests Banner ── */}
            {pendingRequests.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3"
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-yellow-800">
                            {pendingRequests.length} pending credit request{pendingRequests.length > 1 ? 's' : ''} awaiting approval
                        </p>
                    </div>
                    <Button size="sm" variant="outline"
                        className="h-7 text-xs border-yellow-300 text-yellow-700 flex-shrink-0"
                        onClick={() => setActiveTab('requests')}>
                        Review
                    </Button>
                </motion.div>
            )}

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9">
                    <TabsTrigger value="tenants" className="text-xs px-4">
                        Tenants
                        <span className="ml-1.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                            {tenants.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="text-xs px-4">
                        Credit Requests
                        {pendingRequests.length > 0 && (
                            <span className="ml-1.5 bg-yellow-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
                                {pendingRequests.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="text-xs px-4">Transactions</TabsTrigger>
                </TabsList>

                {/* ══ TAB 1 — TENANTS ══ */}
                <TabsContent value="tenants" className="mt-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input placeholder="Search by name, email or phone..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 text-sm" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-40 text-sm">
                                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        {['Tenant', 'Industry', 'Credits', 'Status', 'Joined', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTenants.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                                                No tenants found
                                            </td>
                                        </tr>
                                    ) : filteredTenants.map((tenant) => (
                                        <tr key={tenant.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-foreground">{tenant.name}</p>
                                                <p className="text-xs text-muted-foreground">{tenant.email ?? '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                                                {tenant.industry ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'text-sm font-semibold',
                                                    (tenant.credits_balance ?? 0) < 100 ? 'text-red-500' : 'text-foreground'
                                                )}>
                                                    {(tenant.credits_balance ?? 0).toLocaleString()}
                                                </span>
                                                {(tenant.credits_balance ?? 0) < 100 && (
                                                    <p className="text-[10px] text-red-400">Low balance</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'text-xs font-medium rounded-full px-2.5 py-1 capitalize',
                                                    getStatusBadge(tenant.status)
                                                )}>
                                                    {tenant.status ?? 'inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {fmtDate(tenant.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                                        onClick={() => openTenantDetail(tenant)}>
                                                        <Eye className="w-3 h-3 mr-1" /> View
                                                    </Button>
                                                    <Button size="sm"
                                                        className="h-7 px-2 text-xs bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                                                        onClick={() => openDisbursal(tenant)}>
                                                        <Plus className="w-3 h-3 mr-1" /> Credits
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                                                <MoreVertical className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => updateTenantStatus(tenant.id, 'active')}>
                                                                <CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500" /> Set Active
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => updateTenantStatus(tenant.id, 'inactive')}>
                                                                <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Set Inactive
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => updateTenantStatus(tenant.id, 'suspended')}
                                                                className="text-red-600">
                                                                <XCircle className="w-3.5 h-3.5 mr-2" /> Suspend
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ══ TAB 2 — CREDIT REQUESTS ══ */}
                <TabsContent value="requests" className="mt-4 space-y-3">
                    {creditRequests.length === 0 ? (
                        <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
                            <Send className="w-8 h-8 mx-auto mb-3 opacity-25" />
                            <p className="text-sm">No credit requests yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {creditRequests.map((req) => (
                                <motion.div
                                    key={req.id}
                                    variants={itemVariants} initial="hidden" animate="visible"
                                    className={cn(
                                        'bg-card rounded-xl border p-4',
                                        req.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : 'border-border'
                                    )}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-foreground text-sm">{req.tenant_name}</p>
                                                <span className={cn(
                                                    'text-[10px] font-bold rounded-full px-2 py-0.5 uppercase',
                                                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                )}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            {req.tenant_email && (
                                                <p className="text-xs text-muted-foreground">{req.tenant_email}</p>
                                            )}
                                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground">
                                                    {req.credits.toLocaleString()} credits
                                                </span>
                                                <span>·</span>
                                                <span>₹{req.price}</span>
                                                <span>·</span>
                                                <span>{req.package_label}</span>
                                                <span>·</span>
                                                <span>{fmtDate(req.created_at)}</span>
                                            </div>
                                            {req.note && (
                                                <p className="text-xs bg-muted rounded-lg px-3 py-1.5 text-foreground mt-1">
                                                    💬 {req.note}
                                                </p>
                                            )}
                                        </div>
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2 flex-shrink-0">
                                                <Button size="sm"
                                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleRequestAction(req, 'approved')}>
                                                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                                </Button>
                                                <Button size="sm" variant="outline"
                                                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleRequestAction(req, 'rejected')}>
                                                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ══ TAB 3 — TRANSACTIONS ══ */}
                <TabsContent value="transactions" className="mt-4">
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        {['Tenant', 'Type', 'Credits', 'Amount', 'Description', 'Date', 'Status'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                                                No transactions yet
                                            </td>
                                        </tr>
                                    ) : transactions.map((txn) => (
                                        <tr key={txn.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                                                {tenants.find(t => t.id === txn.tenant_id)?.name ?? `Tenant #${txn.tenant_id}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs capitalize bg-muted rounded-full px-2 py-0.5">{txn.type}</span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {txn.credits > 0
                                                    ? <span className="text-green-600">+{txn.credits.toLocaleString()}</span>
                                                    : <span className="text-muted-foreground">{txn.credits.toLocaleString()}</span>}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                                                ₹{Math.abs(txn.amount ?? 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">
                                                {txn.description ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {fmtDate(txn.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'text-xs font-medium rounded-full px-2 py-0.5 capitalize',
                                                    txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        txn.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                )}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ══ TENANT DETAIL MODAL ══ */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <DialogTitle className="text-base font-semibold truncate">{selectedTenant?.name}</DialogTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">{selectedTenant?.email ?? 'No email'}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={cn(
                                    'text-xs font-medium rounded-full px-2.5 py-1 capitalize',
                                    getStatusBadge(selectedTenant?.status ?? null)
                                )}>
                                    {selectedTenant?.status ?? 'inactive'}
                                </span>
                                <Button size="sm"
                                    className="h-7 text-xs bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
                                    onClick={() => { setIsDetailOpen(false); openDisbursal(selectedTenant!); }}>
                                    <Plus className="w-3 h-3 mr-1" /> Credits
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {isDetailLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1">
                            <Tabs defaultValue="details" className="w-full">
                                <TabsList className="mx-5 mt-4 h-8">
                                    <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                                    <TabsTrigger value="whatsapp" className="text-xs">WhatsApp API</TabsTrigger>
                                    <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
                                </TabsList>

                                {/* Details */}
                                <TabsContent value="details" className="px-5 py-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: <Mail className="w-3.5 h-3.5" />, label: 'Email', value: selectedTenant?.email },
                                            { icon: <Phone className="w-3.5 h-3.5" />, label: 'Phone', value: selectedTenant?.phone },
                                            { icon: <Globe className="w-3.5 h-3.5" />, label: 'Industry', value: selectedTenant?.industry },
                                            { icon: <Crown className="w-3.5 h-3.5" />, label: 'Plan', value: selectedTenant?.plan ?? 'Free' },
                                            { icon: <Wallet className="w-3.5 h-3.5" />, label: 'Balance', value: `${(selectedTenant?.credits_balance ?? 0).toLocaleString()} credits` },
                                            { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Joined', value: selectedTenant?.created_at ? fmtDate(selectedTenant.created_at) : '—' },
                                        ].map(({ icon, label, value }) => (
                                            <div key={label} className="bg-muted rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                                    {icon}
                                                    <p className="text-[10px] uppercase tracking-wide font-semibold">{label}</p>
                                                </div>
                                                <p className="text-sm font-medium text-foreground">{value || '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* WhatsApp API */}
                                <TabsContent value="whatsapp" className="px-5 py-4 space-y-3">
                                    {!tenantWAConfig ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-muted-foreground">No WhatsApp config found</p>
                                            <p className="text-xs text-muted-foreground mt-1">This tenant hasn't set up WhatsApp yet</p>
                                        </div>
                                    ) : (
                                        <>
                                            {[
                                                { label: 'Display Phone', value: tenantWAConfig.display_phone, secret: false },
                                                { label: 'Phone Number ID', value: tenantWAConfig.phone_number_id, secret: false },
                                                { label: 'Business Account ID', value: tenantWAConfig.business_account_id, secret: false },
                                                { label: 'Webhook Verify Token', value: tenantWAConfig.webhook_verify_token, secret: true },
                                                { label: 'Access Token', value: tenantWAConfig.access_token, secret: true },
                                            ].map(({ label, value, secret }) => (
                                                <div key={label} className="bg-muted rounded-xl p-3">
                                                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">
                                                        {label}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs font-mono text-foreground flex-1 truncate">
                                                            {secret && !showToken ? '•'.repeat(24) : (value || '—')}
                                                        </code>
                                                        <div className="flex gap-1 flex-shrink-0">
                                                            {secret && (
                                                                <button onClick={() => setShowToken(v => !v)}
                                                                    className="text-muted-foreground hover:text-foreground">
                                                                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                </button>
                                                            )}
                                                            {value && (
                                                                <button onClick={() => copyToClipboard(value, label)}
                                                                    className="text-muted-foreground hover:text-foreground">
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className={cn(
                                                'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium border',
                                                tenantWAConfig.status === 'active'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                            )}>
                                                <div className={cn('w-2 h-2 rounded-full',
                                                    tenantWAConfig.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                                )} />
                                                WhatsApp API: {tenantWAConfig.status}
                                            </div>
                                        </>
                                    )}
                                </TabsContent>

                                {/* Billing */}
                                <TabsContent value="billing" className="px-5 py-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-foreground">Transaction History</p>
                                        <span className="text-xs text-muted-foreground">{tenantTxns.length} records</span>
                                    </div>
                                    {tenantTxns.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {tenantTxns.map((txn) => (
                                                <div key={txn.id}
                                                    className="flex items-center justify-between bg-muted rounded-xl px-3 py-2.5 gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-foreground capitalize">{txn.type}</p>
                                                        <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                                                            {txn.description ?? '—'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={cn(
                                                            'text-sm font-bold',
                                                            txn.credits > 0 ? 'text-green-600' : 'text-muted-foreground'
                                                        )}>
                                                            {txn.credits > 0 ? '+' : ''}{txn.credits.toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {fmtDateShort(txn.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ══ CREDIT DISBURSAL MODAL ══ */}
            <Dialog open={isDisbursalOpen} onOpenChange={setIsDisbursalOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
                        <DialogTitle className="text-sm font-semibold">Add Credits</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Disbursing to{' '}
                            <span className="font-medium text-foreground">{disbursalTenant?.name}</span>
                        </p>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-4">
                        <div>
                            <Label className="text-xs font-medium mb-1.5 block">Credits to Add *</Label>
                            <Input type="number" value={disbursalCredits}
                                onChange={e => setDisbursalCredits(e.target.value)}
                                placeholder="e.g. 5000" className="h-9 text-sm" />
                        </div>
                        <div>
                            <Label className="text-xs font-medium mb-1.5 block">
                                Amount Paid (₹){' '}
                                <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input type="number" value={disbursalAmount}
                                onChange={e => setDisbursalAmount(e.target.value)}
                                placeholder="e.g. 3499" className="h-9 text-sm" />
                        </div>
                        <div>
                            <Label className="text-xs font-medium mb-1.5 block">
                                Note{' '}
                                <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Textarea value={disbursalNote}
                                onChange={e => setDisbursalNote(e.target.value)}
                                placeholder="e.g. Growth package — NEFT received 19 Apr"
                                rows={2} className="text-sm resize-none" />
                        </div>
                        {disbursalCredits && (
                            <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Adding</span>
                                <span className="font-bold text-green-600">
                                    +{Number(disbursalCredits).toLocaleString()} credits
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="px-5 pb-5 flex gap-2">
                        <Button variant="outline" className="flex-1 h-9 text-sm"
                            onClick={() => setIsDisbursalOpen(false)} disabled={isDisbursing}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700 text-white"
                            disabled={!disbursalCredits || isDisbursing}
                            onClick={handleDisburse}
                        >
                            {isDisbursing
                                ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Adding...</>
                                : <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Credits</>
                            }
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default SuperAdmin;