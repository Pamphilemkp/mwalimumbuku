import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [dyslexiaMode, setDyslexiaMode] = useState(false);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle(); if (error) throw error; return data; },
    enabled: !!user, retry: 1, staleTime: 30000,
  });

  useEffect(() => { if (profile) { setFullName(profile.full_name); setDyslexiaMode(profile.dyslexia_mode); } }, [profile]);
  useEffect(() => { document.body.classList.toggle('dyslexia-mode', dyslexiaMode); }, [dyslexiaMode]);

  const updateProfile = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('profiles').update({ full_name: fullName, dyslexia_mode: dyslexiaMode }).eq('user_id', user!.id); if (error) throw error; },
    onSuccess: () => { toast.success(t.profilePage.profileUpdated); qc.invalidateQueries({ queryKey: ['profile'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <p className="text-muted-foreground">{t.profilePage.errorLoad}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.profilePage.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.profilePage.subtitle}</p>
      </div>
      <div className="max-w-lg space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2"><Label>{t.profilePage.email}</Label><Input value={user?.email ?? ''} disabled /></div>
        <div className="space-y-2"><Label>{t.profilePage.userId}</Label><Input value={user?.id ?? ''} disabled className="font-mono text-xs" /></div>
        <div className="space-y-2"><Label>{t.profilePage.fullName}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="flex items-center gap-3"><Switch checked={dyslexiaMode} onCheckedChange={setDyslexiaMode} /><Label>{t.profilePage.dyslexiaMode}</Label></div>
        <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>{t.profilePage.saveChanges}</Button>
      </div>
    </div>
  );
}
