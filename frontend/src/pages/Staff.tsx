// pages/Staff.tsx — team member management (admin only)
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Trash2, RefreshCw, Shield, User,
  Mail, MoreVertical, Crown,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api       from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin:  'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  staff:  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function Staff() {
  const { user }          = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm]   = useState({ name: '', email: '', role: 'staff' });
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/staff');
      setMembers(data.data);
    } catch { toast.error('Failed to load team members'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, []);

  const invite = async () => {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email required');
    setInviting(true);
    try {
      await api.post('/api/staff/invite', form);
      toast.success(`Invite sent to ${form.email}`);
      setShowInvite(false);
      setForm({ name: '', email: '', role: 'staff' });
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invite failed');
    } finally { setInviting(false); }
  };

  const updateRole = async (member: Member, role: string) => {
    try {
      await api.patch(`/api/staff/${member.id}/role`, { role });
      toast.success('Role updated');
      fetchMembers();
    } catch { toast.error('Update failed'); }
  };

  const removeMember = async (member: Member) => {
    if (!confirm(`Remove ${member.name} from the team?`)) return;
    try {
      await api.delete(`/api/staff/${member.id}`);
      toast.success('Member removed');
      fetchMembers();
    } catch { toast.error('Remove failed'); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage who has access to your workspace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchMembers} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite
          </Button>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" /> Admin — full access</span>
        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Staff — campaigns, contacts, inbox</span>
        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Viewer — read-only</span>
      </div>

      {members.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <UserPlus className="w-7 h-7 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No team members yet</p>
          <p className="text-sm mt-1">Invite colleagues to collaborate in your workspace</p>
          <Button className="mt-4" size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite first member
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border divide-y">
          {members.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3.5"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{m.name}</span>
                  {m.id === Number(user?.id) && (
                    <Badge variant="secondary" className="text-[10px] py-0 h-4">you</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', ROLE_COLORS[m.role] ?? ROLE_COLORS.viewer)}>
                {m.role}
              </span>
              {user?.role === 'admin' && m.id !== Number(user?.id) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateRole(m, 'admin')}>Make admin</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateRole(m, 'staff')}>Set as staff</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateRole(m, 'viewer')}>Set as viewer</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={() => removeMember(m)}>Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Full name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ravi Kumar" />
            </div>
            <div>
              <Label>Email address</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ravi@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              An email with a temporary password will be sent to invite them.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={invite} disabled={inviting}>
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
