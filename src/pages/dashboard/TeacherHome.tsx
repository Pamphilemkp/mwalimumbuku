import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeacherCourses } from '@/hooks/useCourses';
import { BookOpen, PlusCircle, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherHome() {
  const { user } = useAuth();
  const { data: courses } = useTeacherCourses();

  const published = courses?.filter((c) => c.is_published).length ?? 0;
  const drafts = courses?.filter((c) => !c.is_published).length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome, {user?.user_metadata?.full_name || 'Teacher'}!
        </h1>
        <p className="mt-1 text-muted-foreground">Manage your courses and students.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Courses', value: courses?.length ?? 0, icon: BookOpen },
          { label: 'Published', value: published, icon: BookOpen },
          { label: 'Drafts', value: drafts, icon: ClipboardList },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5">
            <s.icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/dashboard/my-courses">
          <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer">
            <BookOpen className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-display font-semibold text-foreground">My Courses</h3>
            <p className="mt-1 text-sm text-muted-foreground">View and manage your courses</p>
          </div>
        </Link>
        <Link to="/dashboard/create-course">
          <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer">
            <PlusCircle className="mb-3 h-8 w-8 text-accent" />
            <h3 className="font-display font-semibold text-foreground">Create Course</h3>
            <p className="mt-1 text-sm text-muted-foreground">Build new learning content</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
