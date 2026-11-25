"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { toast } from '@/src/components/ui/sonner';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Copy, Shield, Key, User, Settings, IdCard } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user, retry: 1, staleTime: 30000,
  });

  useEffect(() => { if (profile) { setFullName(profile.full_name); setDyslexiaMode(profile.dyslexia_mode); } }, [profile]);
  useEffect(() => { document.body.classList.toggle('dyslexia-mode', dyslexiaMode); }, [dyslexiaMode]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ full_name: fullName, dyslexia_mode: dyslexiaMode }).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t.profilePage.profileUpdated); qc.invalidateQueries({ queryKey: ['profile'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Mot de passe mis à jour avec succès !');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <p className="text-muted-foreground">{t.profilePage.errorLoad}</p>;

  const roleLabels: Record<string, string> = { student: 'Élève', parent: 'Parent', teacher: 'Enseignant', admin: 'Administrateur' };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.profilePage.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.profilePage.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identity Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <IdCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Carte d'identité</h2>
              <Badge variant="secondary" className="capitalize">{roleLabels[role ?? 'student']}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-card/80 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Code unique</p>
                <p className="font-mono font-bold text-foreground">{(profile as any)?.student_code || '—'}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard((profile as any)?.student_code || '', 'Code')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-card/80 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(user?.email || '', 'Email')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-card/80 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">ID Utilisateur</p>
                <p className="font-mono text-xs text-foreground truncate max-w-[200px]">{user?.id}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(user?.id || '', 'ID')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Profile Edit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
              <User className="h-5 w-5 text-secondary" />
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">Informations personnelles</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.profilePage.fullName}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={dyslexiaMode} onCheckedChange={setDyslexiaMode} />
              <Label>{t.profilePage.dyslexiaMode}</Label>
            </div>
            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="w-full">
              {t.profilePage.saveChanges}
            </Button>
          </div>
        </motion.div>

        {/* Password Change */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Key className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">Changer le mot de passe</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword} variant="destructive" className="w-full">
                {changingPassword ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
