import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { data, isLoading } = useOnboarding();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const onOnboardingRoute = location.pathname.startsWith('/onboarding');
  // Admins bypass onboarding. Other roles must complete it.
  if (role && role !== 'admin' && data && !data.onboarding_completed && !onOnboardingRoute) {
    return <Navigate to={`/onboarding/${role}`} replace />;
  }
  return <>{children}</>;
}
