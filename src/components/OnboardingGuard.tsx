// Onboarding data is now collected in the signup form, so the guard is a no-op.
// Kept as a pass-through wrapper to avoid touching every route definition.
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
