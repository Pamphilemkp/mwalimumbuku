import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, BarChart3, Shield, TrendingUp, DollarSign, MessageCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export default function AdminHome() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

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

  const { data: enrollmentCount } = useQuery({
    queryKey: ['admin-enrollment-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('course_enrollments').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: premiumCount } = useQuery({
    queryKey: ['admin-premium-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('tier', 'premium').eq('is_active', true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = [
    { label: t.adminHome.totalUsers, value: userCount ?? 0, icon: Users, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
    { label: t.adminHome.totalCourses, value: courseCount ?? 0, icon: BookOpen, gradient: 'from-accent/20 to-accent/5', iconColor: 'text-accent' },
    { label: 'Total Enrollments', value: enrollmentCount ?? 0, icon: TrendingUp, gradient: 'from-secondary/20 to-secondary/5', iconColor: 'text-secondary' },
    { label: 'Premium Users', value: premiumCount ?? 0, icon: DollarSign, gradient: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-600' },
  ];

  const actions = [
    { label: t.adminHome.manageUsers, href: '/dashboard/users', icon: Users, desc: t.adminHome.manageUsersDesc, color: 'from-primary/10 to-primary/5' },
    { label: t.adminHome.manageCourses, href: '/dashboard/manage-courses', icon: BookOpen, desc: t.adminHome.manageCoursesDesc, color: 'from-accent/10 to-accent/5' },
    { label: t.adminHome.analytics, href: '/dashboard/analytics', icon: BarChart3, desc: t.adminHome.analyticsDesc, color: 'from-secondary/10 to-secondary/5' },
    { label: lang === 'fr' ? 'Paramètres' : 'Settings', href: '/dashboard/settings', icon: Settings, desc: lang === 'fr' ? 'Configurer jeux et boîte à outils' : 'Configure games and toolbox', color: 'from-amber-500/10 to-amber-500/5' },
    { label: 'Messages', href: '/dashboard/messages', icon: MessageCircle, desc: lang === 'fr' ? 'Voir et gérer les messages' : 'View and manage platform messages', color: 'from-primary/10 to-primary/5' },
    { label: 'Forum', href: '/dashboard/forum', icon: MessageCircle, desc: lang === 'fr' ? 'Modérer les discussions du forum' : 'Moderate forum discussions', color: 'from-accent/10 to-accent/5' },
    { label: 'Documentation', href: '/dashboard/docs', icon: Settings, desc: lang === 'fr' ? 'Guides et documentation' : 'Platform docs & guides', color: 'from-muted to-muted/50' },
  ];

  return (
    <div className="space-y-8">
      {/* Admin banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6 sm:p-8"
      >
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t.adminHome.title}</h1>
            <p className="text-muted-foreground">{t.adminHome.desc}</p>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn('rounded-2xl border border-border/50 bg-gradient-to-br p-5', s.gradient)}
          >
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-sm', s.iconColor)}>
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Admin actions */}
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Management</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((item, i) => (
            <Link key={item.href} to={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={cn(
                  'rounded-2xl border border-border/50 bg-gradient-to-br p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full',
                  item.color
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
