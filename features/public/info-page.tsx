"use client";

import { useLanguage } from "@/features/landing/language";
import { publicCopy } from "./copy";
import { PublicFrame } from "./site-chrome";

type PageKey = "aboutPage" | "howPage" | "studentsPage" | "parentsPage" | "schoolsPage";

export function InfoPage({ pageKey }: { pageKey: PageKey }) {
  const { lang } = useLanguage();
  const page = publicCopy[lang][pageKey];

  return (
    <PublicFrame>
      <main className="container max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{page.lede}</p>
        <div className="mt-8 space-y-4">
          {page.sections.map((section) => (
            <section key={section.heading} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">{section.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </PublicFrame>
  );
}
