import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Users, Search, Shield, UserCog } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminUsers() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: parentLinks } = useQuery({
    queryKey: ['admin-parent-links'],
    queryFn: async () => {
      const { data, error } = await supabase.from('parent_student').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments').select('*, courses(title)');
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated.');
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);
  const subMap = new Map(subscriptions?.map((s) => [s.user_id, s]) ?? []);
  const parentLinksByParent = new Map<string, string[]>();
  parentLinks?.forEach((pl) => {
    const existing = parentLinksByParent.get(pl.parent_id) || [];
    existing.push(pl.student_id);
    parentLinksByParent.set(pl.parent_id, existing);
  });

  const getProfileName = (userId: string) => {
    return profiles?.find((p) => p.user_id === userId)?.full_name || 'Unknown';
  };

  const filtered = profiles?.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(s) ||
      (roleMap.get(p.user_id) ?? '').toLowerCase().includes(s)
    );
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  const stats = {
    total: profiles?.length ?? 0,
    students: roles?.filter(r => r.role === 'student').length ?? 0,
    teachers: roles?.filter(r => r.role === 'teacher').length ?? 0,
    parents: roles?.filter(r => r.role === 'parent').length ?? 0,
    admins: roles?.filter(r => r.role === 'admin').length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-muted-foreground">{stats.total} registered users.</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Students', value: stats.students, color: 'text-primary' },
          { label: 'Teachers', value: stats.teachers, color: 'text-accent' },
          { label: 'Parents', value: stats.parents, color: 'text-secondary' },
          { label: 'Admins', value: stats.admins, color: 'text-destructive' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or role…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subscription</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                {role === 'admin' && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered?.map((p) => {
                const userRole = roleMap.get(p.user_id) ?? 'unknown';
                const sub = subMap.get(p.user_id);
                const linkedChildren = parentLinksByParent.get(p.user_id);

                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {userRole === 'admin' && <Shield className="h-3.5 w-3.5 text-destructive" />}
                        {p.full_name || 'Unnamed'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {userRole}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sub?.tier === 'premium' ? 'default' : 'outline'} className="text-xs capitalize">
                        {sub?.tier || 'free'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {userRole === 'parent' && linkedChildren && (
                        <span>Children: {linkedChildren.map(id => getProfileName(id)).join(', ')}</span>
                      )}
                      {userRole === 'student' && (
                        <span>
                          {enrollments?.filter(e => e.user_id === p.user_id).length ?? 0} enrollments
                        </span>
                      )}
                      {userRole === 'teacher' && (
                        <span>Teacher</span>
                      )}
                      {p.dyslexia_mode && <span className="ml-2">📖 Dyslexia</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    {role === 'admin' && (
                      <td className="px-4 py-3">
                        <Select
                          value={userRole}
                          onValueChange={(v) => updateRole.mutate({ userId: p.user_id, newRole: v })}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
