import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — Mwalimu Mbuku",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      lede="Enter your email. If an account exists, we will send a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
