import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Key, 
  Bell, 
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Check,
  X
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const Settings: React.FC = () => {
  const { tenant, staff } = useTenant();
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  const [companySettings, setCompanySettings] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    industry: tenant?.industry || ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    campaignAlerts: true,
    leadAlerts: true,
    appointmentReminders: true,
    billingAlerts: true
  });

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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your company profile and preferences
        </p>
      </motion.div>

      {/* Settings Tabs */}
      <Tabs defaultValue="company">
        <motion.div variants={itemVariants}>
          <TabsList className="bg-muted">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Company Settings */}
        <TabsContent value="company" className="mt-6">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Company Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={companySettings.name}
                  onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email"
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input 
                  value={companySettings.industry}
                  onChange={(e) => setCompanySettings({...companySettings, industry: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Address</Label>
                <Input 
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="mt-6">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                <p className="text-sm text-muted-foreground">Manage your sales team and agents</p>
              </div>
              <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="john@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                        Add Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <img 
                            src={member.avatar} 
                            alt={member.name}
                            className="w-10 h-10 rounded-full bg-muted"
                          />
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="capitalize text-foreground">{member.role}</span>
                      </td>
                      <td>
                        <span className={cn(
                          'status-badge',
                          member.status === 'active' ? 'status-success' : 'status-error'
                        )}>
                          {member.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-6">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h2>
            <div className="space-y-6">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive updates via SMS' },
                { key: 'campaignAlerts', label: 'Campaign Alerts', desc: 'Get notified about campaign performance' },
                { key: 'leadAlerts', label: 'New Lead Alerts', desc: 'Get notified when new leads come in' },
                { key: 'appointmentReminders', label: 'Appointment Reminders', desc: 'Reminders before scheduled appointments' },
                { key: 'billingAlerts', label: 'Billing Alerts', desc: 'Notifications about credits and billing' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch 
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, [item.key]: checked})
                    }
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="mt-6">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">WhatsApp API Configuration</h2>
                <p className="text-sm text-muted-foreground">Connect your WhatsApp Business API</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-foreground">API Status</p>
                    <p className="text-sm text-muted-foreground">Connection to WhatsApp Business API</p>
                  </div>
                  <span className="status-badge status-success">Connected</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Phone Number</p>
                    <p className="font-medium text-foreground">+1 (555) 123-4567</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Business Name</p>
                    <p className="font-medium text-foreground">{tenant?.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="password" 
                      value="sk-xxxxxxxxxxxxxxxxxxxx" 
                      readOnly 
                      className="flex-1"
                    />
                    <Button variant="outline">Reveal</Button>
                    <Button variant="outline">Regenerate</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://api.realchatpro.com/webhook/xxxxx" 
                      readOnly 
                      className="flex-1"
                    />
                    <Button variant="outline">Copy</Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Settings;
