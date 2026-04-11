import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import logo from '@/assets/logo.png';
import {
  LogOut, User, Home, Award, Smile,
  Users, BarChart3, MessageSquare, Menu, X,
  PlusCircle, ClipboardList, CreditCard, MessageCircle, BookOpen, FileText, Gamepad2, Wrench, Play
} from 'lucide-react';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const roleNavItems: Record<string, NavItem[]> = {
  student: [
    { labelKey: 'dashboard', href: '/dashboard', icon: Home },
    { labelKey: 'courses', href: '/dashboard/courses', icon: BookOpen },
    { labelKey: 'myProgress', href: '/dashboard/progress', icon: BarChart3 },
    { labelKey: 'badges', href: '/dashboard/badges', icon: Award },
    { labelKey: 'games', href: '/dashboard/games', icon: Gamepad2 },
    { labelKey: 'toolbox', href: '/dashboard/toolbox', icon: Wrench },
    { labelKey: 'mood', href: '/dashboard/mood', icon: Smile },
    { labelKey: 'forum', href: '/dashboard/forum', icon: MessageSquare },
    { labelKey: 'messages', href: '/dashboard/messages', icon: MessageCircle },
    { labelKey: 'subscription', href: '/dashboard/subscription', icon: CreditCard },
    { labelKey: 'docs', href: '/dashboard/docs', icon: FileText },
    { labelKey: 'onboarding', href: '/dashboard/onboarding', icon: Play },
    { labelKey: 'profile', href: '/dashboard/profile', icon: User },
  ],
  teacher: [
    { labelKey: 'dashboard', href: '/dashboard', icon: Home },
    { labelKey: 'myCourses', href: '/dashboard/my-courses', icon: BookOpen },
    { labelKey: 'createCourse', href: '/dashboard/create-course', icon: PlusCircle },
    { labelKey: 'studentResults', href: '/dashboard/results', icon: ClipboardList },
    { labelKey: 'messages', href: '/dashboard/messages', icon: MessageCircle },
    { labelKey: 'forum', href: '/dashboard/forum', icon: MessageSquare },
    { labelKey: 'docs', href: '/dashboard/docs', icon: FileText },
    { labelKey: 'onboarding', href: '/dashboard/onboarding', icon: Play },
    { labelKey: 'profile', href: '/dashboard/profile', icon: User },
  ],
  parent: [
    { labelKey: 'dashboard', href: '/dashboard', icon: Home },
    { labelKey: 'myChildren', href: '/dashboard/children', icon: Users },
    { labelKey: 'progress', href: '/dashboard/child-progress', icon: BarChart3 },
    { labelKey: 'messages', href: '/dashboard/messages', icon: MessageCircle },
    { labelKey: 'forum', href: '/dashboard/forum', icon: MessageSquare },
    { labelKey: 'docs', href: '/dashboard/docs', icon: FileText },
    { labelKey: 'onboarding', href: '/dashboard/onboarding', icon: Play },
    { labelKey: 'profile', href: '/dashboard/profile', icon: User },
  ],
  admin: [
    { labelKey: 'dashboard', href: '/dashboard', icon: Home },
    { labelKey: 'users', href: '/dashboard/users', icon: Users },
    { labelKey: 'manageCourses', href: '/dashboard/manage-courses', icon: BookOpen },
    { labelKey: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { labelKey: 'messages', href: '/dashboard/messages', icon: MessageCircle },
    { labelKey: 'forum', href: '/dashboard/forum', icon: MessageSquare },
    { labelKey: 'docs', href: '/dashboard/docs', icon: FileText },
    { labelKey: 'onboarding', href: '/dashboard/onboarding', icon: Play },
    { labelKey: 'profile', href: '/dashboard/profile', icon: User },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = roleNavItems[role ?? 'student'] ?? roleNavItems.student;
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

  const handleSignOut = async () => {
    await signOut();
    // Clear react-query cache to prevent stale data
    window.location.href = '/login';
  };

  const roleColor: Record<string, string> = {
    student: 'bg-primary/10 text-primary',
    parent: 'bg-secondary/10 text-secondary',
    teacher: 'bg-accent/10 text-accent',
    admin: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <img src={logo} alt="Mwalimu Mbuku" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-bold text-foreground">Mwalimu</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}>
                <item.icon className="h-4 w-4" />
                {(t.nav as any)[item.labelKey] || item.labelKey}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 space-y-3">
          <LanguageSwitcher variant="outline" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', roleColor[role ?? 'student'])}>
                {roleLabel}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0" title={t.logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <img src={logo} alt="Mwalimu Mbuku" className="h-8 w-8 object-contain" />
          <span className="font-display font-bold text-foreground">Mwalimu</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
