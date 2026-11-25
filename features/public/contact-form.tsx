"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { useLanguage } from "@/features/landing/language";
import { submitContactAction } from "./contact-action";
import { publicCopy } from "./copy";
import { PublicFrame } from "./site-chrome";

export function ContactPage() {
  const { lang } = useLanguage();
  const t = publicCopy[lang].contactPage;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await submitContactAction({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      topic: String(form.get("topic") ?? ""),
      message: String(form.get("message") ?? ""),
    });
    setPending(false);
    setOk(result.status === "saved");
    setMessage(result.status === "saved" ? t.saved : result.message === "Check the name, email, and message." ? t.invalid : t.unavailable);
  }

  return (
    <PublicFrame>
      <main className="container max-w-xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">{t.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{t.lede}</p>
        {message ? (
          <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm ${ok ? "bg-primary/10" : "bg-destructive/10"}`}>
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.name}</Label>
            <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">{t.topic}</Label>
            <select
              id="topic"
              name="topic"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="student"
            >
              {t.topics.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t.message}</Label>
            <Textarea id="message" name="message" required minLength={10} maxLength={2000} rows={6} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? t.working : t.submit}
          </Button>
        </form>
      </main>
    </PublicFrame>
  );
}
