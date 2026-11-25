"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/features/landing/language-switcher";
import { useLanguage } from "@/features/landing/language";
import { publicCopy } from "./copy";

const links = [
  ["/about", "about"],
  ["/how-it-works", "how"],
  ["/students", "students"],
  ["/parents", "parents"],
  ["/schools", "schools"],
  ["/contact", "contact"],
] as const;

export function PublicHeader() {
  const { lang } = useLanguage();
  const t = publicCopy[lang];

  const linkClass = "rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95">
      <nav className="container flex h-14 items-center gap-3 px-4" aria-label={t.navLabel}>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-display text-base font-bold sm:text-lg">Mwalimu Mbuku</span>
        </Link>
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map(([href, key]) => (
            <Link key={href} href={href} className={linkClass}>
              {t[key]}
            </Link>
          ))}
          <LanguageSwitcher />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t.login}
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">{t.signup}</Button>
          </Link>
        </div>
        <details className="ml-auto lg:hidden">
          <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-2 text-sm font-medium">
            {t.menu}
          </summary>
          <div className="absolute inset-x-0 top-14 z-50 border-b border-border bg-background px-4 py-3 shadow-sm">
            <div className="flex flex-col">
              {links.map(([href, key]) => (
                <Link key={href} href={href} className="py-2 text-base">
                  {t[key]}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <LanguageSwitcher />
                <Link href="/login" className="py-2 text-base">
                  {t.login}
                </Link>
                <Link href="/signup">
                  <Button size="sm">{t.signup}</Button>
                </Link>
              </div>
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const { lang } = useLanguage();
  const t = publicCopy[lang];
  return (
    <footer className="border-t border-border py-6">
      <div className="container flex flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Mwalimu Mbuku. {t.footer}</p>
        <Link href="/contact" className="underline-offset-4 hover:underline">
          {t.contact}
        </Link>
      </div>
    </footer>
  );
}

export function PublicFrame({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const t = publicCopy[lang];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        {t.skip}
      </a>
      <PublicHeader />
      <div id="content" className="flex-1">
        {children}
      </div>
      <PublicFooter />
    </div>
  );
}
