import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, 
  Send, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  MessageSquare,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  property?: string;
  budget?: string;
  status: string;
}

interface MessageStatus {
  id: string;
  phone: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: string;
}

const BulkMessaging: React.FC = () => {
  const { campaigns, refreshCampaigns } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [useLeads, setUseLeads] = useState(true);

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'draft');

  const stats = {
    total: messageStatuses.length,
    sent: messageStatuses.filter(m => m.status === 'sent').length,
    delivered: messageStatuses.filter(m => m.status === 'delivered').length,
    pending: messageStatuses.filter(m => m.status === 'pending').length,
    failed: messageStatuses.filter(m => m.status === 'failed').length
  };

  // Fetch leads from API
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      console.log('Fetching leads from API...');
      const response = await axios.get('/api/leads');
      console.log('Leads response:', response.data);
      
      if (response.data.success && response.data.data) {
        setLeads(response.data.data);
        console.log(`Loaded ${response.data.data.length} leads`);
      } else if (Array.isArray(response.data)) {
        setLeads(response.data);
        console.log(`Loaded ${response.data.length} leads`);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    }
  };

  // Load selected campaign message
  useEffect(() => {
    if (selectedCampaign) {
      const campaign = campaigns.find(c => c.id === parseInt(selectedCampaign));
      if (campaign) {
        setMessageTemplate(campaign.message);
      }
    }
  }, [selectedCampaign, campaigns]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setUploadedFile(file);
      setUseLeads(false);
      toast.success('File uploaded successfully');
    }
  };

  const handleSendMessages = async () => {
    if (!messageTemplate.trim()) {
      toast.error('Please enter a message template');
      return;
    }

    if (!useLeads && !uploadedFile) {
      toast.error('Please upload a CSV file or use leads from database');
      return;
    }

    setIsSending(true);
    setProgress(0);

    try {
      if (useLeads) {
        await sendToLeads();
      } else {
        await sendFromCSV();
      }
    } catch (error: any) {
      console.error('Bulk send error:', error);
      toast.error(error.message || 'Failed to send messages');
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  };

  const sendToLeads = async () => {
    console.log('All leads:', leads);
    const leadsWithPhone = leads.filter(l => l.phone && l.phone.trim() !== '');
    console.log('Leads with phone:', leadsWithPhone);
    
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
        timestamp: new Date().toISOString()
      }))
    );

    let sentCount = 0;
    const total = leadsWithPhone.length;

    for (let i = 0; i < leadsWithPhone.length; i++) {
      const lead = leadsWithPhone[i];
      
      try {
        // Personalize message
        let personalizedMessage = messageTemplate
          .replace(/\{\{name\}\}/g, lead.name)
          .replace(/\{\{property\}\}/g, lead.property || 'our property')
          .replace(/\{\{budget\}\}/g, lead.budget || 'your budget')
          .replace(/\{\{phone\}\}/g, lead.phone);

        console.log(`Sending to ${lead.name} (${lead.phone}):`, personalizedMessage);

        // Send message via backend
        const response = await axios.post('/api/whatsapp/send-message', {
          to: lead.phone,
          message: personalizedMessage
        });

        console.log('Send response:', response.data);

        if (response.data.success) {
          setMessageStatuses(prev => 
            prev.map(m => m.id === lead.id 
              ? { ...m, status: 'sent', timestamp: new Date().toISOString() }
              : m
            )
          );
          sentCount++;
        } else {
          throw new Error(response.data.error || 'Failed to send');
        }
      } catch (error: any) {
        console.error(`Failed to send to ${lead.name}:`, error);
        setMessageStatuses(prev => 
          prev.map(m => m.id === lead.id 
            ? { 
                ...m, 
                status: 'failed', 
                error: error.response?.data?.error || error.message,
                timestamp: new Date().toISOString() 
              }
            : m
          )
        );
      }

      // Update progress
      setProgress(Math.round(((i + 1) / total) * 100));
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    toast.success(`Messages sent to ${sentCount} out of ${total} leads`);
    
    if (refreshCampaigns) {
      await refreshCampaigns();
    }
  };

  const sendFromCSV = async () => {
    if (!uploadedFile) return;

    const text = await uploadedFile.text();
    const rows = text.split('\n').slice(1);
    const contacts = rows
      .map(row => {
        const [name, phone] = row.split(',');
        return { name: name?.trim(), phone: phone?.trim() };
      })
      .filter(c => c.name && c.phone);

    if (contacts.length === 0) {
      toast.error('No valid contacts found in CSV');
      return;
    }

    setMessageStatuses(
      contacts.map((contact, idx) => ({
        id: `csv_${idx}`,
        phone: contact.phone,
        name: contact.name,
        status: 'pending',
        timestamp: new Date().toISOString()
      }))
    );

    let sentCount = 0;
    const total = contacts.length;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        let personalizedMessage = messageTemplate
          .replace(/\{\{name\}\}/g, contact.name)
          .replace(/\{\{phone\}\}/g, contact.phone);

        const response = await axios.post('/api/whatsapp/send-message', {
          to: contact.phone,
          message: personalizedMessage
        });

        if (response.data.success) {
          setMessageStatuses(prev => 
            prev.map(m => m.id === `csv_${i}` 
              ? { ...m, status: 'sent', timestamp: new Date().toISOString() }
              : m
            )
          );
          sentCount++;
        }
      } catch (error: any) {
        setMessageStatuses(prev => 
          prev.map(m => m.id === `csv_${i}` 
            ? { 
                ...m, 
                status: 'failed', 
                error: error.response?.data?.error || error.message,
                timestamp: new Date().toISOString() 
              }
            : m
          )
        );
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    toast.success(`Messages sent to ${sentCount} out of ${total} contacts`);
  };

  const getStatusBadge = (status: MessageStatus['status']) => {
    switch (status) {
      case 'sent': return 'status-success';
      case 'delivered': return 'status-info';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'status-warning';
      case 'failed': return 'status-error';
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
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bulk WhatsApp Messaging</h1>
        <p className="text-muted-foreground mt-1">
          Send personalized messages to multiple leads at once
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'bg-muted' },
          { label: 'Sent', value: stats.sent, icon: CheckCircle, color: 'bg-green-100' },
          { label: 'Delivered', value: stats.delivered, icon: MessageSquare, color: 'bg-blue-100' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-yellow-100' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: 'bg-red-100' }
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-xl p-4', stat.color)}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload & Send Section */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Campaign Selection */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Campaign Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Campaign (Optional)</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a campaign template" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id.toString()}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message Template *</Label>
                <Textarea 
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Hi {{name}}, check out our latest property at {{property}}..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{name}}'}, {'{{property}}'}, {'{{budget}}'}, {'{{phone}}'} for personalization
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useLeads"
                  checked={useLeads}
                  onChange={(e) => setUseLeads(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useLeads">
                  Send to leads from database ({leads.filter(l => l.phone).length} leads with phone)
                </Label>
              </div>

              {leads.length === 0 && useLeads && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No leads found. Please add leads first or upload a CSV file.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File Upload */}
          {!useLeads && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Upload CSV</h3>
              <p className="text-sm text-muted-foreground mb-4">
                CSV format: name,phone (one per line)
              </p>
              <div 
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                  uploadedFile ? "border-success bg-success/5" : "border-border hover:border-tenant-accent"
                )}
              >
                {uploadedFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-10 h-10 text-success mx-auto" />
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground mb-1">
                      Drop your CSV file here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse
                    </p>
                    <input 
                      type="file" 
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>Select File</span>
                    </Button>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button 
            className="w-full h-12 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
            disabled={!messageTemplate.trim() || (!useLeads && !uploadedFile) || isSending || (useLeads && leads.filter(l => l.phone).length === 0)}
            onClick={handleSendMessages}
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending Messages...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Bulk Messages
              </div>
            )}
          </Button>

          {isSending && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Sending messages... {progress}% complete
              </p>
            </div>
          )}
        </motion.div>

        {/* Status Table */}
        <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Message Status</h3>
            <p className="text-sm text-muted-foreground">Real-time delivery tracking</p>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="data-table">
              <thead className="sticky top-0 bg-card z-10">
                <tr>
                  <th>Recipient</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {messageStatuses.map((msg) => (
                  <tr key={msg.id}>
                    <td className="font-medium text-foreground">{msg.name}</td>
                    <td className="text-muted-foreground">{msg.phone}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={cn('status-badge capitalize', getStatusBadge(msg.status))}>
                          {msg.status}
                        </span>
                        {msg.error && (
                          <span 
                            className="text-xs text-destructive cursor-help" 
                            title={msg.error}
                          >
                            ⓘ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {messageStatuses.length === 0 && (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No messages sent yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                {useLeads 
                  ? leads.length === 0 
                    ? 'No leads available. Please add leads first.'
                    : `Ready to send to ${leads.filter(l => l.phone).length} leads with phone numbers`
                  : 'Upload a CSV file to get started'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BulkMessaging;

