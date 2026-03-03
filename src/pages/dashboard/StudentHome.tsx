import { motion } from 'framer-motion';
import { BookOpen, Award, BarChart3, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserResults, useUserBadges, usePublishedCourses } from '@/hooks/useCourses';

export default function StudentHome() {
  const { user } = useAuth();
  const { data: results } = useUserResults();
  const { data: badges } = useUserBadges();
  const { data: courses } = usePublishedCourses();

  const totalPoints = results?.reduce((sum, r) => sum + r.points_earned, 0) ?? 0;
  const correctCount = results?.filter((r) => r.is_correct).length ?? 0;

  const stats = [
    { label: 'Total Points', value: totalPoints, icon: BarChart3, color: 'text-primary' },
    { label: 'Correct Answers', value: correctCount, icon: Award, color: 'text-secondary' },
    { label: 'Badges Earned', value: badges?.length ?? 0, icon: Award, color: 'text-accent' },
    { label: 'Available Courses', value: courses?.length ?? 0, icon: BookOpen, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
        </h1>
        <p className="mt-1 text-muted-foreground">Here's your learning overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Browse Courses', href: '/dashboard/courses', icon: BookOpen, desc: 'Find new courses to learn' },
            { label: 'View Badges', href: '/dashboard/badges', icon: Award, desc: 'See your achievements' },
            { label: 'Log Mood', href: '/dashboard/mood', icon: Smile, desc: 'How are you feeling today?' },
          ].map((item, i) => (
            <Link key={item.href} to={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <item.icon className="mb-3 h-8 w-8 text-primary" />
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
