"use client";

import { supabase } from '@/src/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminAnalytics() {
  const { data: userCount } = useQuery({
    queryKey: ['admin-user-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: courseCount } = useQuery({
    queryKey: ['admin-course-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('courses').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: resultCount } = useQuery({
    queryKey: ['admin-result-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('results').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: badgeCount } = useQuery({
    queryKey: ['admin-badge-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('user_badges').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = [
    { label: 'Total Users', value: userCount ?? 0 },
    { label: 'Total Courses', value: courseCount ?? 0 },
    { label: 'Exercise Attempts', value: resultCount ?? 0 },
    { label: 'Badges Earned', value: badgeCount ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5">
            <BarChart3 className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
