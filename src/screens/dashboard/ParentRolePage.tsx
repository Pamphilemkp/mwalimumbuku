"use client";

import { useQuery } from '@tanstack/react-query';
import { Link } from '@/src/lib/next-router';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  HeartHandshake, Sparkles, TrendingUp, MessageSquare, BookOpen,
  Smile, AlertCircle, Lightbulb, ArrowRight,
} from 'lucide-react';

const tips = [
  "Établissez une routine quotidienne d'étude calme et régulière.",
  "Valorisez les efforts, pas seulement les résultats.",
  "Lisez ensemble 15 minutes par jour, peu importe l'âge.",
  "Limitez les écrans pendant les devoirs.",
  "Posez des questions ouvertes : « Qu'as-tu appris aujourd'hui ? »",
  "Communiquez régulièrement avec les enseignants.",
];

const strategies = [
  { title: "Apprentissage multi-sensoriel", body: "Combinez lecture, écoute et écriture pour mieux mémoriser." },
  { title: "Pauses actives", body: "5 minutes de mouvement toutes les 25 minutes améliorent la concentration." },
  { title: "Cartes mentales", body: "Aident les enfants visuels à organiser leurs idées." },
  { title: "Lecture à voix haute", body: "Renforce la fluidité et la compréhension." },
];

export default function ParentRolePage() {
  const { user } = useAuth();

  const { data: children } = useQuery({
    queryKey: ['parent-role-children', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('children_info').select('*').eq('parent_id', user!.id);
      return data ?? [];
    },
  });

  const { data: links } = useQuery({
    queryKey: ['parent-role-links', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('parent_student').select('student_id, profiles:student_id(full_name)')
        .eq('parent_id', user!.id);
      return data ?? [];
    },
  });

  const { data: recentMsgs } = useQuery({
    queryKey: ['parent-role-msgs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('messages').select('id, content, created_at, sender_id')
        .eq('receiver_id', user!.id).order('created_at', { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
            <HeartHandshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Mon rôle en tant que parent</h1>
            <p className="text-sm text-muted-foreground">Comprendre, accompagner, encourager votre enfant.</p>
          </div>
        </div>
      </motion.div>

      {/* Children weaknesses */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <AlertCircle className="h-5 w-5 text-accent" /> Ce que votre enfant doit améliorer
        </h2>
        {children && children.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((c: any) => (
              <Card key={c.id} className="p-4">
                <h3 className="font-medium text-foreground">{c.full_name}</h3>
                {c.class_level && <p className="text-xs text-muted-foreground">{c.class_level}</p>}
                {c.weaknesses && (
                  <div className="mt-2"><Badge variant="secondary">Points faibles</Badge>
                    <p className="mt-1 text-sm">{c.weaknesses}</p></div>
                )}
                {c.learning_difficulties && (
                  <div className="mt-2"><Badge variant="outline">Difficultés</Badge>
                    <p className="mt-1 text-sm">{c.learning_difficulties}</p></div>
                )}
                {c.goals && (
                  <div className="mt-2"><Badge>Objectifs</Badge>
                    <p className="mt-1 text-sm">{c.goals}</p></div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">
            Aucun enfant déclaré. <Link to="/onboarding/parent" className="text-primary underline">Compléter votre profil</Link>
          </Card>
        )}
      </section>

      {/* How to support */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <HeartHandshake className="h-5 w-5 text-primary" /> Comment soutenir votre enfant
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {tips.map((t, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t}
            </div>
          ))}
        </div>
      </section>

      {/* Strategies */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Lightbulb className="h-5 w-5 text-accent" /> Stratégies d'apprentissage
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {strategies.map((s, i) => (
            <Card key={i} className="p-4">
              <h3 className="font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Teacher messages */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <MessageSquare className="h-5 w-5 text-primary" /> Messages récents des enseignants
        </h2>
        {recentMsgs && recentMsgs.length > 0 ? (
          <div className="space-y-2">
            {recentMsgs.map((m: any) => (
              <Card key={m.id} className="p-3 text-sm">{m.content}</Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        )}
        <Link to="/dashboard/messages"><Button variant="outline" size="sm">Voir tous les messages <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Link to="/dashboard/child-progress">
          <Card className="p-4 hover:border-primary transition">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="mt-2 font-medium">Progrès académiques</h3>
            <p className="text-xs text-muted-foreground">Suivez les résultats de vos enfants.</p>
          </Card>
        </Link>
        <Link to="/dashboard/courses">
          <Card className="p-4 hover:border-primary transition">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="mt-2 font-medium">Cours recommandés</h3>
            <p className="text-xs text-muted-foreground">Découvrez les ressources pédagogiques.</p>
          </Card>
        </Link>
        <Link to="/dashboard/children">
          <Card className="p-4 hover:border-primary transition">
            <Smile className="h-5 w-5 text-primary" />
            <h3 className="mt-2 font-medium">Mes enfants</h3>
            <p className="text-xs text-muted-foreground">Gérer les comptes et observations.</p>
          </Card>
        </Link>
      </section>
    </div>
  );
}
