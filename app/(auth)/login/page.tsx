import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { decideAuthGate } from "@/services/auth/auth-gate";
import { loadAppSession } from "@/services/auth/session";

export default async function LoginPage() {
  const session = await loadAppSession();
  if (session.hasSession) {
    redirect(decideAuthGate(true, session.resolution));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Mwalimu Mbuku</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use the email and password for your account.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
