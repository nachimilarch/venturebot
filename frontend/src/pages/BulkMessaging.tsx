import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, Send, FileSpreadsheet, CheckCircle, XCircle, Clock,
  Users, MessageSquare, AlertCircle, RefreshCw, Coins
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  property?: string;
  budget?: string;
  status: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
}

interface MessageStatus {
  id: string;
  phone: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: string;
}

interface CreditInfo {
  balance: number;
  isLoading: boolean;
  error: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BulkMessaging: React.FC = () => {
  const { campaigns, refreshCampaigns, dashboardStats } = useTenant();
  const [leads, setLeads]                           = useState<Lead[]>([]);
  const [templates, setTemplates]                   = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate]     = useState<string>('');
  const [selectedTemplateObj, setSelectedTemplateObj] = useState<WhatsAppTemplate | null>(null);
  const [uploadedFile, setUploadedFile]             = useState<File | null>(null);
  const [isSending, setIsSending]                   = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [progress, setProgress]                     = useState(0);
  const [messageStatuses, setMessageStatuses]       = useState<MessageStatus[]>([]);
  const [useLeads, setUseLeads]                     = useState(true);
  const [csvContacts, setCsvContacts]               = useState<{ name: string; phone: string }[]>([]);
  const [creditInfo, setCreditInfo]                 = useState<CreditInfo>({
    balance: 0, isLoading: false, error: null,
  });

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const stats = {
    total:     messageStatuses.length,
    sent:      messageStatuses.filter(m => m.status === 'sent').length,
    delivered: messageStatuses.filter(m => m.status === 'delivered').length,
    pending:   messageStatuses.filter(m => m.status === 'pending').length,
    failed:    messageStatuses.filter(m => m.status === 'failed').length,
  };

  // Recipient count based on current mode
  const recipientCount = useLeads
    ? leads.filter(l => l.phone && l.phone.trim() !== '').length
    : csvContacts.length;

  const hasEnoughCredits = creditInfo.balance >= recipientCount;

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchLeads();
    fetchTemplates();
    fetchCredits();
  }, []);

  // ─── Fetchers ──────────────────────────────────────────────────────────────

  const fetchCredits = async () => {
    setCreditInfo(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await axios.get('/api/tenant');
      const tenant = response.data?.data || response.data;
      const balance = tenant?.credits ?? tenant?.credits_balance ?? 0;
      setCreditInfo({ balance, isLoading: false, error: null });
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      setCreditInfo(prev => ({ ...prev, isLoading: false, error: 'Failed to load credits' }));
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await axios.get('/api/leads');
      if (response.data.success && response.data.data) {
        setLeads(response.data.data);
      } else if (Array.isArray(response.data)) {
        setLeads(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await axios.get('/api/whatsapp/templates');
      if (response.data.success) {
        const approved = response.data.templates.filter(
          (t: WhatsAppTemplate) => t.status === 'APPROVED'
        );
        setTemplates(approved);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load WhatsApp templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    const tmpl = templates.find(t => t.name === templateName) || null;
    setSelectedTemplateObj(tmpl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    setUseLeads(false);

    // Parse CSV immediately to get contact count
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').slice(1); // skip header
      const contacts = rows
        .map(row => {
          const [name, phone] = row.split(',');
          return { name: name?.trim(), phone: phone?.trim() };
        })
        .filter(c => c.name && c.phone);
      setCsvContacts(contacts);
      toast.success(`CSV loaded — ${contacts.length} contacts found`);
    };
    reader.readAsText(file);
  };

  // ─── Credit guard ──────────────────────────────────────────────────────────

  const checkCreditsAndConfirm = (): boolean => {
    if (creditInfo.isLoading) {
      toast.error('Still loading credit balance, please wait...');
      return false;
    }

    if (recipientCount === 0) {
      toast.error(useLeads ? 'No leads with phone numbers found' : 'No valid contacts in CSV');
      return false;
    }

    if (creditInfo.balance < recipientCount) {
      toast.error(
        `Insufficient credits. You need ${recipientCount} credits but only have ${creditInfo.balance}.`
      );
      return false;
    }

    return true;
  };

  // ─── Send orchestration ────────────────────────────────────────────────────

  const handleSendMessages = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a WhatsApp template');
      return;
    }
    if (!useLeads && !uploadedFile) {
      toast.error('Please upload a CSV file or use leads from database');
      return;
    }

    // ← Credit check happens here before anything else
    if (!checkCreditsAndConfirm()) return;

    if (!confirm(
      `Send "${selectedTemplate}" to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}?\n\n` +
      `This will use ${recipientCount} of your ${creditInfo.balance} credits.`
    )) return;

    setIsSending(true);
    setProgress(0);

    try {
      if (useLeads) {
        await sendToLeads();
      } else {
        await sendFromCSV();
      }
      // Refresh credits after send
      await fetchCredits();
    } catch (error: any) {
      console.error('Bulk send error:', error);
      toast.error(error.message || 'Failed to send messages');
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  };

  // ─── Send helpers ──────────────────────────────────────────────────────────

  const sendTemplateToContact = async (
    phone: string,
    name: string,
    templateName: string,
    language: string
  ) => {
    const bodyComponent = selectedTemplateObj?.components?.find(
      (c: any) => c.type === 'BODY'
    );
    const hasVariables = /{{\d+}}/.test(bodyComponent?.text || '');

    const response = await axios.post('/api/whatsapp/send-template', {
      to: phone,
      templateName,
      language,
      variables: hasVariables ? { name } : {},
    });
    return response.data;
  };

  const sendToLeads = async () => {
    const leadsWithPhone = leads.filter(l => l.phone && l.phone.trim() !== '');

    if (leadsWithPhone.length === 0) {
      toast.error('No leads with phone numbers found');
      return;
    }

    setMessageStatuses(
      leadsWithPhone.map(lead => ({
        id: lead.id,
        phone: lead.phone,
        name: lead.name,
        status: 'pending',
        timestamp: new Date().toISOString(),
      }))
    );

    let sentCount = 0;
    const total = leadsWithPhone.length;
    const language = selectedTemplateObj?.language || 'en';

    for (let i = 0; i < leadsWithPhone.length; i++) {
      const lead = leadsWithPhone[i];
      try {
        const result = await sendTemplateToContact(lead.phone, lead.name, selectedTemplate, language);

        if (result.success) {
          setMessageStatuses(prev =>
            prev.map(m =>
              m.id === lead.id
                ? { ...m, status: 'sent', timestamp: new Date().toISOString() }
                : m
            )
          );
          sentCount++;
        } else {
          throw new Error(result.error || 'Failed to send');
        }
      } catch (error: any) {
        const errMsg =
          error.response?.data?.error ||
          error.response?.data?.details ||
          error.message;

        setMessageStatuses(prev =>
          prev.map(m =>
            m.id === lead.id
              ? { ...m, status: 'failed', error: errMsg, timestamp: new Date().toISOString() }
              : m
          )
        );
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    toast.success(`Sent to ${sentCount} out of ${total} leads`);
    if (refreshCampaigns) await refreshCampaigns();
  };

  const sendFromCSV = async () => {
    if (csvContacts.length === 0) {
      toast.error('No valid contacts found in CSV');
      return;
    }

    setMessageStatuses(
      csvContacts.map((contact, idx) => ({
        id: `csv_${idx}`,
        phone: contact.phone,
        name: contact.name,
        status: 'pending',
        timestamp: new Date().toISOString(),
      }))
    );

    let sentCount = 0;
    const total = csvContacts.length;
    const language = selectedTemplateObj?.language || 'en';

    for (let i = 0; i < csvContacts.length; i++) {
      const contact = csvContacts[i];
      try {
        const result = await sendTemplateToContact(
          contact.phone, contact.name, selectedTemplate, language
        );

        if (result.success) {
          setMessageStatuses(prev =>
            prev.map(m =>
              m.id === `csv_${i}`
                ? { ...m, status: 'sent', timestamp: new Date().toISOString() }
                : m
            )
          );
          sentCount++;
        } else {
          throw new Error(result.error || 'Failed');
        }
      } catch (error: any) {
        const errMsg =
          error.response?.data?.error ||
          error.response?.data?.details ||
          error.message;

        setMessageStatuses(prev =>
          prev.map(m =>
            m.id === `csv_${i}`
              ? { ...m, status: 'failed', error: errMsg, timestamp: new Date().toISOString() }
              : m
          )
        );
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    toast.success(`Sent to ${sentCount} out of ${total} contacts`);
  };

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  const getStatusBadge = (status: MessageStatus['status']) => {
    switch (status) {
      case 'sent':      return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'read':      return 'bg-purple-100 text-purple-800';
      case 'pending':   return 'bg-yellow-100 text-yellow-800';
      case 'failed':    return 'bg-red-100 text-red-800';
    }
  };

  const getTemplatePreview = (tmpl: WhatsAppTemplate | null): string => {
    if (!tmpl) return '';
    const body = tmpl.components?.find((c: any) => c.type === 'BODY');
    return body?.text || '';
  };

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bulk WhatsApp Messaging
          </h1>
          <p className="text-muted-foreground mt-1">
            Send approved WhatsApp templates to multiple leads at once
          </p>
        </div>

        {/* Credits Badge */}
        <div className={cn(
          'flex items-center gap-2 rounded-xl border px-4 py-3 min-w-[140px]',
          creditInfo.isLoading
            ? 'bg-muted border-border'
            : hasEnoughCredits || recipientCount === 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
        )}>
          <Coins className={cn(
            'w-4 h-4',
            creditInfo.isLoading
              ? 'text-muted-foreground'
              : hasEnoughCredits || recipientCount === 0
                ? 'text-green-600'
                : 'text-red-500'
          )} />
          <div>
            <p className="text-xs text-muted-foreground">Credits</p>
            {creditInfo.isLoading ? (
              <p className="text-sm font-semibold text-muted-foreground">Loading...</p>
            ) : creditInfo.error ? (
              <p className="text-sm font-semibold text-red-500">Error</p>
            ) : (
              <p className={cn(
                'text-sm font-semibold',
                hasEnoughCredits || recipientCount === 0 ? 'text-green-700' : 'text-red-600'
              )}>
                {creditInfo.balance.toLocaleString()}
                {recipientCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    / need {recipientCount}
                  </span>
                )}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={fetchCredits}
            disabled={creditInfo.isLoading}
            title="Refresh credits"
          >
            <RefreshCw className={cn('w-3 h-3', creditInfo.isLoading && 'animate-spin')} />
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',     value: stats.total,     icon: Users,         color: 'bg-muted' },
          { label: 'Sent',      value: stats.sent,      icon: CheckCircle,   color: 'bg-green-100' },
          { label: 'Delivered', value: stats.delivered, icon: MessageSquare, color: 'bg-blue-100' },
          { label: 'Pending',   value: stats.pending,   icon: Clock,         color: 'bg-yellow-100' },
          { label: 'Failed',    value: stats.failed,    icon: XCircle,       color: 'bg-red-100' },
        ].map(stat => (
          <div key={stat.label} className={cn('rounded-xl p-4', stat.color)}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Insufficient credits warning banner */}
      {recipientCount > 0 && !hasEnoughCredits && !creditInfo.isLoading && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">Insufficient credits.</span>{' '}
            You need <strong>{recipientCount}</strong> credits to send to all recipients,
            but only have <strong>{creditInfo.balance}</strong>.
            Please top up your credits before sending.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Panel ── */}
        <motion.div variants={itemVariants} className="space-y-6">

          {/* Template Selection */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Select WhatsApp Template</h3>
              <Button variant="ghost" size="sm" onClick={fetchTemplates} disabled={isLoadingTemplates}>
                <RefreshCw className={cn('w-4 h-4', isLoadingTemplates && 'animate-spin')} />
              </Button>
            </div>

            <div className="space-y-4">
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingTemplates
                      ? 'Loading templates...'
                      : templates.length === 0
                        ? 'No approved templates found'
                        : 'Choose an approved template'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(tmpl => (
                    <SelectItem key={tmpl.id} value={tmpl.name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tmpl.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {tmpl.category} · {tmpl.language}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Template Preview */}
              {selectedTemplateObj && (
                <div className="rounded-lg bg-muted p-4 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Template Preview
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {getTemplatePreview(selectedTemplateObj)}
                  </p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="text-xs bg-background border border-border rounded-full px-2 py-0.5">
                      {selectedTemplateObj.category}
                    </span>
                    <span className="text-xs bg-background border border-border rounded-full px-2 py-0.5">
                      {selectedTemplateObj.language}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                      {selectedTemplateObj.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recipient Source */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Select Recipients</h3>

            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUseLeads(true)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    useLeads
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Use Leads ({leads.filter(l => l.phone).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUseLeads(false)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    !useLeads
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary'
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Upload CSV
                </button>
              </div>

              {/* Leads info */}
              {useLeads && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {leads.filter(l => l.phone).length} leads with phone numbers
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Messages will be sent to all leads that have a valid phone number.
                  </p>
                </div>
              )}

              {/* CSV upload */}
              {!useLeads && (
                <div className="space-y-2">
                  <Label htmlFor="csv-upload" className="text-sm text-muted-foreground">
                    Upload CSV file (columns: name, phone)
                  </Label>
                  <label
                    htmlFor="csv-upload"
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer p-6 transition-colors',
                      uploadedFile
                        ? 'border-green-400 bg-green-50'
                        : 'border-border bg-muted hover:border-primary'
                    )}
                  >
                    {uploadedFile ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <span className="text-sm font-medium text-green-700">{uploadedFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {csvContacts.length} contacts · Click to replace
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Click to upload CSV</span>
                        <span className="text-xs text-muted-foreground">
                          Required columns: name, phone
                        </span>
                      </>
                    )}
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSendMessages}
            disabled={
              isSending ||
              !selectedTemplate ||
              (!useLeads && !uploadedFile) ||
              creditInfo.isLoading ||
              (recipientCount > 0 && !hasEnoughCredits)
            }
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending... {progress}%
              </>
            ) : !hasEnoughCredits && recipientCount > 0 ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Insufficient Credits
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Bulk Messages
                {recipientCount > 0 && (
                  <span className="ml-2 text-xs opacity-80">({recipientCount} recipients)</span>
                )}
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {isSending && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </motion.div>

        {/* ── Right Panel — Message Status ── */}
        <motion.div variants={itemVariants}>
          <div className="bg-card rounded-xl border border-border p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Message Status</h3>
              {messageStatuses.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {messageStatuses.length} recipients
                </span>
              )}
            </div>

            {messageStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                <MessageSquare className="w-12 h-12 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No messages sent yet. Configure your template and recipients, then hit Send.
                </p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[520px] space-y-2 pr-1">
                {messageStatuses.map(msg => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{msg.name}</p>
                      <p className="text-xs text-muted-foreground">{msg.phone}</p>
                      {msg.error && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-500 truncate">{msg.error}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn(
                        'text-xs font-medium rounded-full px-2 py-0.5 capitalize',
                        getStatusBadge(msg.status)
                      )}>
                        {msg.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BulkMessaging;
