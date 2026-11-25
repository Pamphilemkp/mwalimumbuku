import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";
import { loginPageRedirect } from "@/lib/auth/access";
import { safeInternalPath, singleQueryValue } from "@/lib/auth/redirect";
import { loadAppSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in — Mwalimu Mbuku",
};

function noticeCopy(value: unknown): string | null {
  if (value === "password-updated") {
    return "Your password was updated. Sign in with the new password.";
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; notice?: string | string[] }>;
}) {
  const params = await searchParams;
  const session = await loadAppSession();
  const requested = singleQueryValue(params.next);
  const target = loginPageRedirect({
    hasSession: session.hasSession,
    resolution: session.resolution,
    requested,
  });
  if (target) redirect(target);

  const nextPath = safeInternalPath(requested);
  const notice = noticeCopy(singleQueryValue(params.notice));

  return (
    <AuthCard title="Sign in" lede="Use the email and password for your account.">
      {notice ? (
        <p role="status" className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {notice}
        </p>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </AuthCard>
  );
}
