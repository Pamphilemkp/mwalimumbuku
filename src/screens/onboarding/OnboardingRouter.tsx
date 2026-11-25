"use client";

import { Navigate, useParams } from '@/src/lib/next-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useOnboarding } from '@/src/hooks/useOnboarding';
import StudentOnboarding from './StudentOnboarding';
import ParentOnboarding from './ParentOnboarding';
import TeacherOnboarding from './TeacherOnboarding';

export default function OnboardingRouter() {
  const { role: paramRole } = useParams();
  const { user, role, loading, isReady } = useAuth();
  const { data: onb, isLoading } = useOnboarding();

  if (loading || !isReady || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (onb?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  if (role && paramRole !== role) return <Navigate to={`/onboarding/${role}`} replace />;

  if (paramRole === 'student') return <StudentOnboarding />;
  if (paramRole === 'parent') return <ParentOnboarding />;
  if (paramRole === 'teacher') return <TeacherOnboarding />;
  return <Navigate to="/dashboard" replace />;
}
