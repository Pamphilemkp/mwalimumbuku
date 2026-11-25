import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { loadAppSession } from "@/services/auth/session";

export const metadata: Metadata = {
  title: "New password — Mwalimu Mbuku",
};

export default async function ResetPasswordPage() {
  const session = await loadAppSession();

  if (!session.hasSession) {
    return (
      <AuthCard
        title="Link not valid"
        lede="This page needs a valid reset link. The link may have expired, or the session could not be verified."
      >
        <p className="mt-6 text-sm">
          <Link href="/forgot-password" className="font-medium text-primary underline-offset-2 hover:underline">
            Request a new link
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" lede="Choose a password between 8 and 72 characters.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
