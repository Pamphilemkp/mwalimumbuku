"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Ear,
  Eye,
  HandHeart,
  Heart,
  Layers,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language";

const PILLAR_ICONS = [Brain, Layers, Ear, Eye, BookOpen, Wifi, HandHeart, ShieldCheck, TrendingUp, Sparkles];

export function MissionPage() {
  const { t } = useLanguage();
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
  const conditions = [
    "Dyslexie",
    "Dyscalculie",
    "TDAH",
    "Trouble du langage",
    "Retard de développement",
    "Trisomie",
    "Autisme",
  ];
  const audiences = [
    {
      icon: Sparkles,
      title: "Pour les enfants",
      desc: "Un cadre rassurant, structuré et motivant qui valorise chaque progrès.",
      wrap: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      icon: Users,
      title: "Pour les parents",
      desc: "Des outils de suivi simples et des conseils pratiques selon les besoins rencontrés.",
      wrap: "bg-secondary/10",
      iconClass: "text-secondary",
    },
    {
      icon: BookOpen,
      title: "Pour les enseignants",
      desc: "Des ressources pédagogiques adaptées à la classe inclusive et ordinaire.",
      wrap: "bg-accent/10",
      iconClass: "text-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <nav className="container flex h-14 items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Mwalimu Mbuku" width={40} height={40} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
            <span className="font-display text-lg font-bold text-foreground sm:text-xl">{t.appName}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
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

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-[0.04]" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative px-4 py-12 sm:py-20 md:py-28">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t.back}
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs text-accent sm:text-sm">
              <Heart className="h-3.5 w-3.5" /> {t.landing.missionLabel}
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {t.landing.missionTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">{t.landing.whyUsIntro}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container px-4">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 p-6 sm:p-8 md:col-span-2"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
                <AlertCircle className="h-6 w-6 text-accent" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.landing.missionProblemLabel}</p>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">
                Une réalité trop longtemps négligée
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 sm:p-8 md:col-span-3"
            >
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t.landing.missionProblem}</p>
              <div className="mt-5 border-t border-border pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                  Troubles & difficultés concernés
                </p>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <span key={c} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center sm:mb-14">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary sm:text-sm">
                <Sparkles className="h-3.5 w-3.5" /> {t.landing.whyUsLabel}
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">{t.landing.whyUsTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{t.landing.whyUsPillarsTitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {pillars.map((pillar, i) => {
                const Icon = PILLAR_ICONS[i] ?? CheckCircle2;
                const number = String(i + 1).padStart(2, "0");
                return (
                  <motion.div
                    key={pillar}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 font-display text-xs font-bold text-primary">{number}</div>
                        <p className="text-sm leading-relaxed text-foreground">{pillar}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center sm:mb-12">
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Pour qui ?</h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Une plateforme pensée pour chaque acteur du parcours éducatif.
              </p>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {audiences.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                  >
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.wrap}`}>
                      <Icon className={`h-6 w-6 ${c.iconClass}`} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 sm:py-24">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Heart className="h-7 w-7 text-accent" />
            </div>
            <p className="font-display text-2xl font-bold italic leading-tight text-foreground sm:text-3xl md:text-4xl">
              « {t.landing.whyUsNote} »
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-2 px-8 sm:w-auto">
                  {t.landing.ctaButton} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full px-8 sm:w-auto">
                  {t.back}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container flex flex-col items-center justify-between gap-3 px-4 sm:gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
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
