import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Star,
  GripVertical,
  ChevronRight
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Lead } from '@/types/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const pipelineStages = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'interested', label: 'Interested', color: 'bg-yellow-500' },
  { id: 'appointment', label: 'Appointment', color: 'bg-purple-500' },
  { id: 'closed', label: 'Closed', color: 'bg-green-500' }
];

const Leads: React.FC = () => {
  const { leads } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'table' | 'kanban'>('table');

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getLeadsByStatus = (status: string) => 
    filteredLeads.filter(lead => lead.status === status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'status-info';
      case 'interested': return 'status-warning';
      case 'appointment': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'status-success';
      case 'lost': return 'status-error';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads CRM</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your real estate leads
          </p>
        </div>
        <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit">
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </motion.div>

      {/* Filters & View Toggle */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="appointment">Appointment</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'kanban')}>
        <motion.div variants={itemVariants}>
          <TabsList className="bg-muted">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="kanban">Pipeline View</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Table View */}
        <TabsContent value="table" className="mt-4">
          <motion.div 
            variants={itemVariants}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Contact</th>
                    <th>Property</th>
                    <th>Budget</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-tenant-accent-light flex items-center justify-center font-medium tenant-accent-text">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.source}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-foreground">{lead.property}</td>
                      <td className="text-foreground font-medium">{lead.budget}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Star className={cn('w-4 h-4', getScoreColor(lead.score))} />
                          <span className={cn('font-medium', getScoreColor(lead.score))}>
                            {lead.score}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={cn('status-badge capitalize', getStatusColor(lead.status))}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{lead.assignedTo}</td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-4">
          <motion.div 
            variants={itemVariants}
            className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar"
          >
            {pipelineStages.map((stage) => {
              const stageLeads = getLeadsByStatus(stage.id);
              return (
                <div key={stage.id} className="kanban-column">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                      <h3 className="font-semibold text-foreground">{stage.label}</h3>
                    </div>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageLeads.map((lead) => (
                      <motion.div
                        key={lead.id}
                        className="kanban-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-tenant-accent-light flex items-center justify-center text-sm font-medium tenant-accent-text">
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.source}</p>
                            </div>
                          </div>
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.property}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-foreground font-medium">{lead.budget}</span>
                            <div className="flex items-center gap-1">
                              <Star className={cn('w-3 h-3', getScoreColor(lead.score))} />
                              <span className={cn('text-xs font-medium', getScoreColor(lead.score))}>
                                {lead.score}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">{lead.assignedTo}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {stageLeads.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No leads in this stage
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Leads;
