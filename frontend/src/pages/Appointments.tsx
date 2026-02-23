import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User,
  Phone,
  Video,
  Building,
  MoreHorizontal,
  Check,
  X,
  ChevronLeft,
  ChevronRight
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const Appointments: React.FC = () => {
  const { appointments, leads, staff } = useTenant();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'status-info';
      case 'completed': return 'status-success';
      case 'cancelled': return 'status-error';
      case 'rescheduled': return 'status-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'site-visit': return <MapPin className="w-4 h-4" />;
      case 'virtual-tour': return <Video className="w-4 h-4" />;
      case 'meeting': return <Building className="w-4 h-4" />;
      case 'follow-up': return <Phone className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getAppointmentsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(apt => apt.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Manage property viewings and client meetings
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground w-fit">
              <Plus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Lead</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.slice(0, 10).map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} - {lead.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Appointment Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site-visit">Site Visit</SelectItem>
                    <SelectItem value="virtual-tour">Virtual Tour</SelectItem>
                    <SelectItem value="meeting">Office Meeting</SelectItem>
                    <SelectItem value="follow-up">Follow-up Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Property</Label>
                <Input placeholder="Enter property name or address" />
              </div>
              <div className="space-y-2">
                <Label>Assign Agent</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => s.role === 'agent').map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-tenant-accent hover:bg-tenant-accent/90 text-tenant-accent-foreground">
                  Book Appointment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
        <motion.div variants={itemVariants}>
          <TabsList className="bg-muted">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-muted p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((day, index) => {
                const dayAppointments = day ? getAppointmentsForDay(day) : [];
                return (
                  <div 
                    key={index}
                    className={cn(
                      "bg-card min-h-[100px] p-2",
                      !day && "bg-muted/30"
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm",
                          isToday(day) && "bg-tenant-accent text-tenant-accent-foreground font-medium"
                        )}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayAppointments.slice(0, 2).map(apt => (
                            <div 
                              key={apt.id}
                              className="text-xs p-1.5 rounded bg-tenant-accent-light tenant-accent-text truncate cursor-pointer hover:bg-tenant-accent hover:text-tenant-accent-foreground transition-colors"
                            >
                              {apt.time} - {apt.leadName}
                            </div>
                          ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              +{dayAppointments.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Property</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.map((apt) => (
                    <tr key={apt.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-tenant-accent-light flex items-center justify-center font-medium tenant-accent-text text-sm">
                            {apt.leadName.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{apt.leadName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-foreground">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          {new Date(apt.date).toLocaleDateString()}
                          <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                          {apt.time}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-foreground capitalize">
                          {getTypeIcon(apt.type)}
                          {apt.type.replace('-', ' ')}
                        </div>
                      </td>
                      <td className="text-foreground">{apt.property}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{apt.agent}</span>
                        </div>
                      </td>
                      <td>
                        <span className={cn('status-badge capitalize', getStatusColor(apt.status))}>
                          {apt.status}
                        </span>
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
                              <Check className="w-4 h-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <X className="w-4 h-4 mr-2" />
                              Cancel
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
      </Tabs>
    </motion.div>
  );
};

export default Appointments;
