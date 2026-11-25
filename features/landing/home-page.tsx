"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Globe,
  GraduationCap,
  Heart,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language";

export function HomePage() {
  const { t } = useLanguage();

  const features = [
    { icon: GraduationCap, title: t.landing.adaptiveLearning, desc: t.landing.adaptiveDesc, color: "text-primary" },
    { icon: Users, title: t.landing.parentDashboard, desc: t.landing.parentDashboardDesc, color: "text-secondary" },
    { icon: Shield, title: t.landing.accessibility, desc: t.landing.accessibilityDesc, color: "text-accent" },
    { icon: Sparkles, title: t.landing.gamified, desc: t.landing.gamifiedDesc, color: "text-primary" },
    { icon: Globe, title: t.landing.lowBandwidth, desc: t.landing.lowBandwidthDesc, color: "text-secondary" },
    { icon: BookOpen, title: t.landing.teacherTools, desc: t.landing.teacherToolsDesc, color: "text-accent" },
  ];

  const stats = [
    { value: "10K+", label: t.landing.statsLearners },
    { value: "500+", label: t.landing.statsCourses },
    { value: "98%", label: t.landing.statsSatisfaction },
    { value: "15+", label: t.landing.statsCountries },
  ];

  const steps = [
    { step: "01", title: t.landing.step1Title, desc: t.landing.step1Desc },
    { step: "02", title: t.landing.step2Title, desc: t.landing.step2Desc },
    { step: "03", title: t.landing.step3Title, desc: t.landing.step3Desc },
  ];

  const pillars = [
    t.landing.whyUsPillar1,
    t.landing.whyUsPillar2,
    t.landing.whyUsPillar3,
    t.landing.whyUsPillar4,
    t.landing.whyUsPillar5,
    t.landing.whyUsPillar6,
    t.landing.whyUsPillar7,
    t.landing.whyUsPillar8,
    t.landing.whyUsPillar9,
    t.landing.whyUsPillar10,
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <nav className="container flex h-14 items-center justify-between px-4 sm:h-16">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Mwalimu Mbuku" width={40} height={40} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
            <span className="font-display text-lg font-bold text-foreground sm:text-xl">{t.appName}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/mission" className="hidden md:inline-flex">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Heart className="h-3.5 w-3.5 text-accent" />
                {t.landing.missionLabel}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t.landing.login}
              </Button>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <User className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{t.landing.getStarted}</Button>
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: "var(--gradient-hero)" }} />
        <div className="container relative px-4 py-12 sm:py-20 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary sm:mb-6 sm:px-4 sm:py-1.5 sm:text-sm">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              {t.landing.tagline}
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              {t.landing.heroTitle}{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t.landing.heroHighlight}
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl px-2 text-sm text-muted-foreground sm:mt-6 sm:text-lg">
              {t.landing.heroDesc}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-2 px-6 text-sm sm:w-auto sm:px-8 sm:text-base">
                  {t.landing.startLearning} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full px-6 text-sm sm:w-auto sm:px-8 sm:text-base">
                  {t.landing.haveAccount}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-8 sm:py-12">
        <div className="container px-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-2xl font-bold text-primary sm:text-3xl md:text-4xl">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center sm:mb-12">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs text-accent sm:text-sm">
                <Heart className="h-3.5 w-3.5" /> {t.landing.missionLabel}
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                {t.landing.missionTitle}
              </h2>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-5 sm:p-8"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-10 sm:w-10">
                  <AlertCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent sm:text-sm">
                    {t.landing.missionProblemLabel}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t.landing.missionProblem}
                  </p>
                </div>
              </div>
            </motion.div>
            <div className="mt-6 text-center">
              <Link href="/mission">
                <Button variant="outline" className="gap-2">
                  {t.landing.missionLabel} — {t.landing.whyUsLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center sm:mb-12">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary sm:text-sm">
                <Sparkles className="h-3.5 w-3.5" /> {t.landing.whyUsLabel}
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                {t.landing.whyUsTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
                {t.landing.whyUsIntro}
              </p>
            </div>

            <h3 className="mb-4 font-display text-lg font-semibold text-foreground sm:mb-6 sm:text-xl">
              {t.landing.whyUsPillarsTitle}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              {pillars.map((pillar, i) => (
                <motion.div
                  key={pillar}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 sm:p-4"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs leading-relaxed text-foreground sm:text-sm">{pillar}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-8 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-center sm:mt-10 sm:p-6"
            >
              <Heart className="mx-auto mb-2 h-5 w-5 text-accent" />
              <p className="text-sm font-medium italic text-foreground sm:text-base">{t.landing.whyUsNote}</p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-16">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              {t.landing.featuresTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">{t.landing.featuresDesc}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              const wrap =
                f.color === "text-primary" ? "bg-primary/10" : f.color === "text-secondary" ? "bg-secondary/10" : "bg-accent/10";
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md sm:p-6"
                >
                  <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg sm:mb-4 sm:h-10 sm:w-10 ${wrap}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${f.color}`} />
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">{f.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-16">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              {t.landing.stepsTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 sm:mb-4 sm:h-14 sm:w-14">
                  <span className="font-display text-lg font-bold text-primary sm:text-xl">{s.step}</span>
                </div>
                <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:p-10">
            <Star className="mx-auto mb-3 h-6 w-6 text-primary sm:mb-4 sm:h-8 sm:w-8" />
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl md:text-3xl">{t.landing.ctaTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">{t.landing.ctaDesc}</p>
            <Link href="/signup">
              <Button size="lg" className="mt-4 gap-2 px-6 sm:mt-6 sm:px-8">
                {t.landing.ctaButton} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container flex flex-col items-center justify-between gap-3 px-4 sm:gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            <span className="font-display text-sm font-semibold text-foreground sm:text-base">{t.appName}</span>
          </div>
          <p className="text-center text-xs text-muted-foreground sm:text-sm">
            © {new Date().getFullYear()} {t.appName}. {t.landing.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
