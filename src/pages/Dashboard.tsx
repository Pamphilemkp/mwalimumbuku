import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  const roleColor = {
    student: 'bg-primary/10 text-primary',
    parent: 'bg-secondary/10 text-secondary',
    teacher: 'bg-accent/10 text-accent',
    admin: 'bg-destructive/10 text-destructive',
  }[role ?? 'student'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">Mwalimu Mbuku</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleColor}`}>
              {roleLabel}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your {roleLabel.toLowerCase()} dashboard — Milestone 1 complete ✅
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: 'Profile', icon: User, desc: 'Manage your account settings' },
              { label: 'Courses', icon: BookOpen, desc: 'Browse available courses' },
              { label: 'Progress', icon: BookOpen, desc: 'Track your learning journey' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <item.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
