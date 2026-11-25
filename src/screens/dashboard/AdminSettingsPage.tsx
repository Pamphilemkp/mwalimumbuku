"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/hooks/useAuth';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { toast } from '@/src/components/ui/sonner';
import { Settings, Gamepad2, Wrench, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  const [gameSettings, setGameSettings] = useState({ easy_time: 120, medium_time: 90, hard_time: 60, points_multiplier: 1 });
  const [toolboxSettings, setToolboxSettings] = useState({ calculator: true, spellcheck: true, dictation: true, tts: true, recorder: true });

  useEffect(() => {
    if (settings?.game_settings) setGameSettings(settings.game_settings);
    if (settings?.toolbox_settings) setToolboxSettings(settings.toolbox_settings);
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value, updated_by: user!.id, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === 'fr' ? 'Paramètres sauvegardés' : 'Settings saved');
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {lang === 'fr' ? 'Paramètres de la plateforme' : 'Platform Settings'}
          </h1>
          <p className="text-muted-foreground">
            {lang === 'fr' ? 'Configurez les jeux et la boîte à outils' : 'Configure games and toolbox'}
          </p>
        </div>
      </div>

      {/* Game Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            {lang === 'fr' ? 'Paramètres des jeux' : 'Game Settings'}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{lang === 'fr' ? 'Temps Facile (sec)' : 'Easy Time (sec)'}</Label>
            <Input type="number" value={gameSettings.easy_time}
              onChange={(e) => setGameSettings(s => ({ ...s, easy_time: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'fr' ? 'Temps Moyen (sec)' : 'Medium Time (sec)'}</Label>
            <Input type="number" value={gameSettings.medium_time}
              onChange={(e) => setGameSettings(s => ({ ...s, medium_time: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'fr' ? 'Temps Difficile (sec)' : 'Hard Time (sec)'}</Label>
            <Input type="number" value={gameSettings.hard_time}
              onChange={(e) => setGameSettings(s => ({ ...s, hard_time: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'fr' ? 'Multiplicateur de points' : 'Points Multiplier'}</Label>
            <Input type="number" step="0.1" value={gameSettings.points_multiplier}
              onChange={(e) => setGameSettings(s => ({ ...s, points_multiplier: parseFloat(e.target.value) || 1 }))} />
          </div>
        </div>

        <Button onClick={() => saveSettings.mutate({ key: 'game_settings', value: gameSettings })} 
          disabled={saveSettings.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {lang === 'fr' ? 'Sauvegarder' : 'Save'}
        </Button>
      </motion.div>

      {/* Toolbox Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            {lang === 'fr' ? 'Paramètres de la boîte à outils' : 'Toolbox Settings'}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(['calculator', 'spellcheck', 'dictation', 'tts', 'recorder'] as const).map(tool => (
            <div key={tool} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <Label className="capitalize">{
                lang === 'fr' 
                  ? { calculator: 'Calculatrice', spellcheck: 'Correcteur', dictation: 'Dictée', tts: 'Synthèse vocale', recorder: 'Enregistreur' }[tool]
                  : { calculator: 'Calculator', spellcheck: 'Spell Check', dictation: 'Dictation', tts: 'Text-to-Speech', recorder: 'Recorder' }[tool]
              }</Label>
              <Switch checked={toolboxSettings[tool]}
                onCheckedChange={(v) => setToolboxSettings(s => ({ ...s, [tool]: v }))} />
            </div>
          ))}
        </div>

        <Button onClick={() => saveSettings.mutate({ key: 'toolbox_settings', value: toolboxSettings })}
          disabled={saveSettings.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {lang === 'fr' ? 'Sauvegarder' : 'Save'}
        </Button>
      </motion.div>
    </div>
  );
}
