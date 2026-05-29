import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, Shield, Sparkles, Globe, ArrowRight, Star, BookOpen, User, Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

export default function Index() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: GraduationCap, title: t.landing.adaptiveLearning, desc: t.landing.adaptiveDesc, color: 'text-primary' },
    { icon: Users, title: t.landing.parentDashboard, desc: t.landing.parentDashboardDesc, color: 'text-secondary' },
    { icon: Shield, title: t.landing.accessibility, desc: t.landing.accessibilityDesc, color: 'text-accent' },
    { icon: Sparkles, title: t.landing.gamified, desc: t.landing.gamifiedDesc, color: 'text-primary' },
    { icon: Globe, title: t.landing.lowBandwidth, desc: t.landing.lowBandwidthDesc, color: 'text-secondary' },
    { icon: BookOpen, title: t.landing.teacherTools, desc: t.landing.teacherToolsDesc, color: 'text-accent' },
  ];

  const stats = [
    { value: '10K+', label: t.landing.statsLearners },
    { value: '500+', label: t.landing.statsCourses },
    { value: '98%', label: t.landing.statsSatisfaction },
    { value: '15+', label: t.landing.statsCountries },
  ];

  const steps = [
    { step: '01', title: t.landing.step1Title, desc: t.landing.step1Desc },
    { step: '02', title: t.landing.step2Title, desc: t.landing.step2Desc },
    { step: '03', title: t.landing.step3Title, desc: t.landing.step3Desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <nav className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Mwalimu Mbuku" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
            <span className="font-display text-lg sm:text-xl font-bold text-foreground">{t.appName}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link to="/mission" className="hidden md:inline-flex">
              <Button variant="ghost" size="sm" className="gap-1.5"><Heart className="h-3.5 w-3.5 text-accent" />{t.landing.missionLabel}</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">{t.landing.login}</Button>
              <Button variant="ghost" size="icon" className="sm:hidden"><User className="h-4 w-4" /></Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">{t.landing.getStarted}</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'var(--gradient-hero)' }} />
        <div className="container relative px-4 py-12 sm:py-20 md:py-36">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mx-auto max-w-3xl text-center">
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm text-primary">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              {t.landing.tagline}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-foreground">
              {t.landing.heroTitle}{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t.landing.heroHighlight}</span>
            </h1>
            <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-sm sm:text-lg text-muted-foreground px-2">{t.landing.heroDesc}</p>
            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base gap-2">
                  {t.landing.startLearning} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base">{t.landing.haveAccount}</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-card py-8 sm:py-12">
        <div className="container px-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary">{s.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs sm:text-sm text-accent mb-3">
                <Heart className="h-3.5 w-3.5" /> {t.landing.missionLabel}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t.landing.missionTitle}</h2>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-5 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <AlertCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-accent uppercase tracking-wide">{t.landing.missionProblemLabel}</p>
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">{t.landing.missionProblem}</p>
                </div>
              </div>
            </motion.div>
            <div className="mt-6 text-center">
              <Link to="/mission">
                <Button variant="outline" className="gap-2">
                  {t.landing.missionLabel} — {t.landing.whyUsLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="border-t border-border bg-card py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs sm:text-sm text-primary mb-3">
                <Sparkles className="h-3.5 w-3.5" /> {t.landing.whyUsLabel}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t.landing.whyUsTitle}</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">{t.landing.whyUsIntro}</p>
            </div>

            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">{t.landing.whyUsPillarsTitle}</h3>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              {[
                t.landing.whyUsPillar1, t.landing.whyUsPillar2, t.landing.whyUsPillar3, t.landing.whyUsPillar4, t.landing.whyUsPillar5,
                t.landing.whyUsPillar6, t.landing.whyUsPillar7, t.landing.whyUsPillar8, t.landing.whyUsPillar9, t.landing.whyUsPillar10,
              ].map((pillar, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 sm:p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed">{pillar}</p>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="mt-8 sm:mt-10 rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:p-6 text-center">
              <Heart className="mx-auto mb-2 h-5 w-5 text-accent" />
              <p className="text-sm sm:text-base font-medium text-foreground italic">{t.landing.whyUsNote}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t.landing.featuresTitle}</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">{t.landing.featuresDesc}</p>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className={cn('mb-3 sm:mb-4 inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg', f.color === 'text-primary' && 'bg-primary/10', f.color === 'text-secondary' && 'bg-secondary/10', f.color === 'text-accent' && 'bg-accent/10')}>
                  <f.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', f.color)} />
                </div>
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t.landing.stepsTitle}</h2>
          </div>
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-display text-lg sm:text-xl font-bold text-primary">{s.step}</span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-10 text-center">
            <Star className="mx-auto mb-3 sm:mb-4 h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t.landing.ctaTitle}</h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">{t.landing.ctaDesc}</p>
            <Link to="/signup">
              <Button size="lg" className="mt-4 sm:mt-6 px-6 sm:px-8 gap-2">{t.landing.ctaButton} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container px-4 flex flex-col items-center justify-between gap-3 sm:gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="font-display text-sm sm:text-base font-semibold text-foreground">{t.appName}</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">© {new Date().getFullYear()} {t.appName}. {t.landing.footer}</p>
        </div>
      </footer>
    </div>
  );
}
