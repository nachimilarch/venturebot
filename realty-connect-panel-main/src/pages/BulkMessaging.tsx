import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

interface MessageStatus {
  id: string;
  phone: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp: string;
}

const BulkMessaging: React.FC = () => {
  const { campaigns, leads } = useTenant();
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mock message statuses
  const [messageStatuses] = useState<MessageStatus[]>(() => 
    leads.slice(0, 10).map((lead, index) => ({
      id: lead.id,
      phone: lead.phone,
      name: lead.name,
      status: ['sent', 'delivered', 'pending', 'failed'][index % 4] as MessageStatus['status'],
      timestamp: new Date(Date.now() - index * 60000).toISOString()
    }))
  );

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'draft');

  const stats = {
    total: messageStatuses.length,
    sent: messageStatuses.filter(m => m.status === 'sent').length,
    delivered: messageStatuses.filter(m => m.status === 'delivered').length,
    pending: messageStatuses.filter(m => m.status === 'pending').length,
    failed: messageStatuses.filter(m => m.status === 'failed').length
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleSendMessages = () => {
    setIsSending(true);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsSending(false);
      }
    }, 500);
  };

  const getStatusIcon = (status: MessageStatus['status']) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-chart-3" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: MessageStatus['status']) => {
    switch (status) {
      case 'sent': return 'status-success';
      case 'delivered': return 'status-info';
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
                <Label>Select Campaign</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea 
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Hi {{name}}, check out our latest property at {{property}}..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{name}}'}, {'{{property}}'}, {'{{phone}}'} for personalization
                </p>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Upload Leads</h3>
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
                    accept=".csv,.xlsx"
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

          {/* Send Button */}
          <Button 
            className="w-full h-12 bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground"
            disabled={!selectedCampaign || !uploadedFile || isSending}
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
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
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
                      <span className={cn('status-badge capitalize', getStatusBadge(msg.status))}>
                        {msg.status}
                      </span>
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
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BulkMessaging;
