"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/features/auth/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAccepted(null);
    setPending(true);

    try {
      const result = await requestPasswordResetAction({ email });
      if (result.status === "failed") {
        setError(result.message);
        setPending(false);
        return;
      }
      setAccepted(result.message);
      setPending(false);
    } catch {
      setError("Password recovery is unavailable right now. Try again in a few minutes.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none ring-ring focus:ring-2"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {accepted ? (
        <p role="status" className="text-sm leading-relaxed text-muted-foreground">
          {accepted}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-base font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
