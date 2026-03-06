import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, Users, Shield, Sparkles, Globe, ArrowRight, Star, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: GraduationCap, title: 'Adaptive Learning', desc: 'Lessons that adjust to each student\'s pace and level.', color: 'text-primary' },
  { icon: Users, title: 'Parent Dashboard', desc: 'Track your child\'s progress and connect with teachers.', color: 'text-secondary' },
  { icon: Shield, title: 'Accessibility First', desc: 'Dyslexia mode, audio support, and simple navigation.', color: 'text-accent' },
  { icon: Sparkles, title: 'Gamified Progress', desc: 'Earn badges, track points, and celebrate every win.', color: 'text-primary' },
  { icon: Globe, title: 'Low Bandwidth', desc: 'Designed to work on slow connections across Africa.', color: 'text-secondary' },
  { icon: BookOpen, title: 'Teacher Tools', desc: 'Create courses, exercises, and give instant feedback.', color: 'text-accent' },
];

const stats = [
  { value: '10K+', label: 'Active Learners' },
  { value: '500+', label: 'Courses' },
  { value: '98%', label: 'Satisfaction' },
  { value: '15+', label: 'Countries' },
];

const steps = [
  { step: '01', title: 'Sign Up', desc: 'Create a free account as a student, parent, or teacher.' },
  { step: '02', title: 'Explore Courses', desc: 'Browse published courses and enroll in what excites you.' },
  { step: '03', title: 'Learn & Grow', desc: 'Complete exercises, earn badges, and track your progress.' },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <nav className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">Mwalimu Mbuku</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'var(--gradient-hero)' }} />
        <div className="container relative py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              Education for every learner
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Learn without{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                limits
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              An accessible, gamified learning platform designed for students, parents, and teachers across Africa.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="px-8 text-base gap-2">
                  Start Learning Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  I have an account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-card py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-3xl font-bold text-primary md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Built for real classrooms
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every feature designed with African learners in mind.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className={cn('mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10', f.color === 'text-secondary' && 'bg-secondary/10', f.color === 'text-accent' && 'bg-accent/10')}>
                  <f.icon className={cn('h-5 w-5', f.color)} />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Get started in 3 steps
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-display text-xl font-bold text-primary">{s.step}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-10 text-center">
            <Star className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Ready to start learning?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join thousands of learners across Africa. It's free to start.
            </p>
            <Link to="/signup">
              <Button size="lg" className="mt-6 px-8 gap-2">
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Mwalimu Mbuku</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mwalimu Mbuku. Education for all.
          </p>
        </div>
      </footer>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
