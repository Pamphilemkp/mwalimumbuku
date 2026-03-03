import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, BarChart3, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AdminHome() {
  const { user } = useAuth();

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

  const stats = [
    { label: 'Total Users', value: userCount ?? 0, icon: Users, color: 'text-primary' },
    { label: 'Total Courses', value: courseCount ?? 0, icon: BookOpen, color: 'text-accent' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform overview and management.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5">
            <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Manage Users', href: '/dashboard/users', icon: Users, desc: 'View and manage all users' },
          { label: 'Manage Courses', href: '/dashboard/manage-courses', icon: BookOpen, desc: 'Review and moderate courses' },
          { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, desc: 'Platform usage statistics' },
        ].map((item, i) => (
          <Link key={item.href} to={item.href}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer">
              <item.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
