"use client";

import { Link } from '@/src/lib/next-router';
import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/button';
import {
  Heart, Sparkles, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, BookOpen, User,
  Brain, Ear, Eye, Layers, Wifi, Users as UsersIcon, ShieldCheck, TrendingUp, HandHeart, Star,
} from 'lucide-react';
import { useLanguage } from '@/src/i18n/LanguageContext';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
const logo = "/logo.png";

const PILLAR_ICONS = [Brain, Layers, Ear, Eye, BookOpen, Wifi, HandHeart, ShieldCheck, TrendingUp, Sparkles];

export default function Mission() {
  const { t } = useLanguage();

  const pillars = [
    t.landing.whyUsPillar1, t.landing.whyUsPillar2, t.landing.whyUsPillar3, t.landing.whyUsPillar4, t.landing.whyUsPillar5,
    t.landing.whyUsPillar6, t.landing.whyUsPillar7, t.landing.whyUsPillar8, t.landing.whyUsPillar9, t.landing.whyUsPillar10,
  ];

  const conditions = ['Dyslexie', 'Dyscalculie', 'TDAH', 'Trouble du langage', 'Retard de développement', 'Trisomie', 'Autisme'];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <nav className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Mwalimu Mbuku" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
            <span className="font-display text-lg sm:text-xl font-bold text-foreground">{t.appName}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">{t.landing.login}</Button>
              <Button variant="ghost" size="icon" className="sm:hidden"><User className="h-4 w-4" /></Button>
            </Link>
            <Link to="/signup"><Button size="sm">{t.landing.getStarted}</Button></Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-[0.04]" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative px-4 py-12 sm:py-20 md:py-28">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> {t.back}
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs sm:text-sm text-accent mb-4">
              <Heart className="h-3.5 w-3.5" /> {t.landing.missionLabel}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-foreground">
              {t.landing.missionTitle}
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t.landing.whyUsIntro}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Problem block */}
      <section className="py-12 sm:py-16">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-5">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="md:col-span-2 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-6 sm:p-8 border border-accent/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 mb-4">
                <AlertCircle className="h-6 w-6 text-accent" />
              </div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider">{t.landing.missionProblemLabel}</p>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-foreground">
                Une réalité trop longtemps négligée
              </h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="md:col-span-3 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t.landing.missionProblem}</p>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Troubles & difficultés concernés</p>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <span key={c} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{c}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Us — pillars */}
      <section className="border-t border-border bg-card py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs sm:text-sm text-primary mb-3">
                <Sparkles className="h-3.5 w-3.5" /> {t.landing.whyUsLabel}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t.landing.whyUsTitle}</h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">{t.landing.whyUsPillarsTitle}</p>
            </div>

            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {pillars.map((pillar, i) => {
                const Icon = PILLAR_ICONS[i] || CheckCircle2;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative rounded-2xl border border-border bg-background p-5 sm:p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-display text-xs font-bold text-primary mb-1">0{i + 1 < 10 ? i + 1 : i + 1}</div>
                        <p className="text-sm text-foreground leading-relaxed">{pillar}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* For Whom */}
      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Pour qui ?</h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">Une plateforme pensée pour chaque acteur du parcours éducatif.</p>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {[
                { icon: Sparkles, title: 'Pour les enfants', desc: 'Un cadre rassurant, structuré et motivant qui valorise chaque progrès.', color: 'primary' },
                { icon: UsersIcon, title: 'Pour les parents', desc: 'Des outils de suivi simples et des conseils pratiques selon les besoins rencontrés.', color: 'secondary' },
                { icon: BookOpen, title: 'Pour les enseignants', desc: 'Des ressources pédagogiques adaptées à la classe inclusive et ordinaire.', color: 'accent' },
              ].map((c, i) => (
                <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.color === 'primary' ? 'bg-primary/10' : c.color === 'secondary' ? 'bg-secondary/10' : 'bg-accent/10'}`}>
                    <c.icon className={`h-6 w-6 ${c.color === 'primary' ? 'text-primary' : c.color === 'secondary' ? 'text-secondary' : 'text-accent'}`} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto / CTA */}
      <section className="border-t border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 sm:py-24">
        <div className="container px-4">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mb-6">
              <Heart className="h-7 w-7 text-accent" />
            </div>
            <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight italic">
              « {t.landing.whyUsNote} »
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-8 gap-2">
                  {t.landing.ctaButton} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">{t.back}</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container px-4 flex flex-col items-center justify-between gap-3 sm:gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-display text-sm sm:text-base font-semibold text-foreground">{t.appName}</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">© {new Date().getFullYear()} {t.appName}. {t.landing.footer}</p>
        </div>
      </footer>
    </div>
  );
}
