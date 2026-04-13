import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Users, Search, Shield, Plus, Trash2, Eye, Copy, UserPlus, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminUsers() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState<string | null>(null);
  const [linkDialog, setLinkDialog] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'student' });
  const [linkStudentCode, setLinkStudentCode] = useState('');

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

  const { data: results } = useQuery({
    queryKey: ['admin-all-results'],
    queryFn: async () => {
      const { data, error } = await supabase.from('results').select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Rôle mis à jour.'); qc.invalidateQueries({ queryKey: ['admin-roles'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete related data first
      await supabase.from('results').delete().eq('user_id', userId);
      await supabase.from('course_enrollments').delete().eq('user_id', userId);
      await supabase.from('parent_student').delete().or(`parent_id.eq.${userId},student_id.eq.${userId}`);
      await supabase.from('daily_moods').delete().eq('user_id', userId);
      await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      await supabase.from('subscriptions').delete().eq('user_id', userId);
      await supabase.from('user_badges').delete().eq('user_id', userId);
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Utilisateur supprimé.');
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createTeacher = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { full_name: newUser.fullName, role: newUser.role } },
      });
      if (error) throw error;
      // Force role if teacher/admin
      if (data.user && (newUser.role === 'teacher' || newUser.role === 'admin')) {
        await supabase.from('user_roles').update({ role: newUser.role as any }).eq('user_id', data.user.id);
      }
    },
    onSuccess: () => {
      toast.success('Compte créé avec succès !');
      setCreateDialog(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'student' });
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const linkParentStudent = useMutation({
    mutationFn: async ({ parentId, studentCode }: { parentId: string; studentCode: string }) => {
      const { data: studentProfile, error: sErr } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('student_code', studentCode)
        .single();
      if (sErr || !studentProfile) throw new Error('Élève non trouvé avec ce code.');
      const { error } = await supabase.from('parent_student').insert({ parent_id: parentId, student_id: studentProfile.user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lien parent-élève créé !');
      setLinkDialog(null);
      setLinkStudentCode('');
      qc.invalidateQueries({ queryKey: ['admin-parent-links'] });
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

  const getProfileName = (userId: string) => profiles?.find((p) => p.user_id === userId)?.full_name || 'Inconnu';
  const getProfileCode = (userId: string) => profiles?.find((p) => p.user_id === userId)?.student_code || '';

  const filtered = profiles?.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(s) ||
      (p as any).student_code?.toLowerCase().includes(s) ||
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

  const selectedProfile = detailDialog ? profiles?.find(p => p.user_id === detailDialog) : null;
  const selectedResults = detailDialog ? results?.filter(r => r.user_id === detailDialog) ?? [] : [];
  const selectedEnrollments = detailDialog ? enrollments?.filter(e => e.user_id === detailDialog) ?? [] : [];
  const selectedChildren = detailDialog ? parentLinksByParent.get(detailDialog) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Gestion des Utilisateurs</h1>
          <p className="mt-1 text-muted-foreground">{stats.total} utilisateurs enregistrés.</p>
        </div>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Créer un compte</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un nouveau compte</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={newUser.fullName} onChange={(e) => setNewUser(p => ({ ...p, fullName: e.target.value }))} placeholder="Nom complet..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Mot de passe..." />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Élève</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="teacher">Enseignant</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createTeacher.mutate()} disabled={createTeacher.isPending || !newUser.email || !newUser.password}>
                {createTeacher.isPending ? 'Création...' : 'Créer le compte'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, gradient: 'from-foreground/5 to-foreground/0' },
          { label: 'Élèves', value: stats.students, gradient: 'from-primary/15 to-primary/5' },
          { label: 'Enseignants', value: stats.teachers, gradient: 'from-accent/15 to-accent/5' },
          { label: 'Parents', value: stats.parents, gradient: 'from-secondary/15 to-secondary/5' },
          { label: 'Admins', value: stats.admins, gradient: 'from-destructive/15 to-destructive/5' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn('rounded-xl border border-border bg-gradient-to-br p-4 text-center', s.gradient)}>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, code ou rôle…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rôle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Abonnement</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Détails</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inscrit le</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((p) => {
                const userRole = roleMap.get(p.user_id) ?? 'unknown';
                const sub = subMap.get(p.user_id);
                const linkedChildren = parentLinksByParent.get(p.user_id);

                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {userRole === 'admin' && <Shield className="h-3.5 w-3.5 text-destructive" />}
                        {p.full_name || 'Sans nom'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { navigator.clipboard.writeText((p as any).student_code || ''); toast.success('Code copié !'); }}
                        className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                        {(p as any).student_code || '—'}
                        <Copy className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs capitalize">{userRole}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sub?.tier === 'premium' ? 'default' : 'outline'} className="text-xs capitalize">{sub?.tier || 'free'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {userRole === 'parent' && linkedChildren && (
                        <span>Enfants: {linkedChildren.map(id => getProfileName(id)).join(', ')}</span>
                      )}
                      {userRole === 'student' && (
                        <span>{enrollments?.filter(e => e.user_id === p.user_id).length ?? 0} cours</span>
                      )}
                      {userRole === 'teacher' && <span>Enseignant</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDetailDialog(p.user_id)} title="Voir détails">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {userRole === 'parent' && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setLinkDialog(p.user_id)} title="Lier un enfant">
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Select value={userRole} onValueChange={(v) => updateRole.mutate({ userId: p.user_id, newRole: v })}>
                          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Élève</SelectItem>
                            <SelectItem value="teacher">Enseignant</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm('Supprimer cet utilisateur ?')) deleteUser.mutate(p.user_id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(o) => !o && setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Détails de l'utilisateur</DialogTitle></DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nom:</span> <span className="font-medium text-foreground">{selectedProfile.full_name}</span></div>
                <div><span className="text-muted-foreground">Code:</span> <span className="font-mono text-foreground">{(selectedProfile as any).student_code}</span></div>
                <div><span className="text-muted-foreground">Rôle:</span> <Badge variant="secondary" className="capitalize">{roleMap.get(selectedProfile.user_id)}</Badge></div>
                <div><span className="text-muted-foreground">Inscrit:</span> <span>{new Date(selectedProfile.created_at).toLocaleDateString('fr-FR')}</span></div>
                <div><span className="text-muted-foreground">Dyslexie:</span> <span>{selectedProfile.dyslexia_mode ? '✅ Activé' : '❌ Désactivé'}</span></div>
                <div><span className="text-muted-foreground">Langue:</span> <span>{selectedProfile.locale}</span></div>
              </div>

              {selectedEnrollments.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Cours inscrits ({selectedEnrollments.length})</h4>
                  <div className="space-y-1">
                    {selectedEnrollments.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                        <span className="text-foreground">{e.courses?.title || 'Cours'}</span>
                        <span className="text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedResults.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Résultats ({selectedResults.length})</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-lg font-bold text-foreground">{selectedResults.reduce((s, r) => s + r.points_earned, 0)}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-lg font-bold text-foreground">{selectedResults.filter(r => r.is_correct).length}</p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-lg font-bold text-foreground">
                        {selectedResults.length > 0 ? Math.round((selectedResults.filter(r => r.is_correct).length / selectedResults.length) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Précision</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedChildren.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Enfants liés</h4>
                  <div className="space-y-1">
                    {selectedChildren.map(id => (
                      <div key={id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{getProfileName(id)}</span>
                        <span className="text-xs text-muted-foreground font-mono">{getProfileCode(id)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Link Parent-Student Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={(o) => { if (!o) { setLinkDialog(null); setLinkStudentCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lier un enfant à ce parent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code de l'élève (STU-XXXXXX)</Label>
              <Input value={linkStudentCode} onChange={(e) => setLinkStudentCode(e.target.value)} placeholder="STU-..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => linkDialog && linkParentStudent.mutate({ parentId: linkDialog, studentCode: linkStudentCode })}
              disabled={linkParentStudent.isPending || !linkStudentCode}>
              {linkParentStudent.isPending ? 'Liaison...' : 'Lier l\'enfant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
