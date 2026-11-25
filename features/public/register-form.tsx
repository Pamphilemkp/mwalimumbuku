"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { registerAccountAction } from "@/features/auth/actions";
import { useLanguage } from "@/features/landing/language";
import { publicCopy } from "./copy";
import { PublicFrame } from "./site-chrome";

export function RegisterForm({ role }: { role: "student" | "parent" }) {
  const { lang } = useLanguage();
  const t = publicCopy[lang];
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await registerAccountAction({
      role,
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    setOk(result.status === "accepted");
    setMessage(result.status === "accepted" ? t.register.accepted : t.register[result.code]);
  }

  return (
    <PublicFrame>
      <main className="container max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-bold">
          {role === "student" ? t.register.studentTitle : t.register.parentTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.register.lede}</p>
        {message ? (
          <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm ${ok ? "bg-primary/10" : "bg-destructive/10"}`}>
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t.register.name}</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.register.email}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.register.password}</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
            <p className="text-xs text-muted-foreground">{t.register.passwordHint}</p>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t.register.working : t.register.submit}
          </Button>
        </form>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            {t.login}
          </Link>
        </p>
      </main>
    </PublicFrame>
  );
}

export function SignupChooser() {
  const { lang } = useLanguage();
  const t = publicCopy[lang];
  return (
    <PublicFrame>
      <main className="container max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">{t.signupChooser.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{t.signupChooser.lede}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/signup/student" className="rounded-xl border border-border bg-card p-5 hover:border-primary">
            <h2 className="font-display text-xl font-semibold">{t.signupChooser.student}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.signupChooser.studentLede}</p>
          </Link>
          <Link href="/signup/parent" className="rounded-xl border border-border bg-card p-5 hover:border-primary">
            <h2 className="font-display text-xl font-semibold">{t.signupChooser.parent}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.signupChooser.parentLede}</p>
          </Link>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            {t.signupChooser.haveAccount}
          </Link>
        </p>
      </main>
    </PublicFrame>
  );
}
