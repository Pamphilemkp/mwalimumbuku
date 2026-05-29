import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';

interface Props {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  onPrev?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  isSubmitting?: boolean;
  canProceed?: boolean;
  children: ReactNode;
}

export default function OnboardingWizard({
  title, subtitle, currentStep, totalSteps, stepTitle,
  onPrev, onNext, onFinish, isSubmitting, canProceed = true, children,
}: Props) {
  const pct = Math.round(((currentStep + 1) / totalSteps) * 100);
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <img src={logo} alt="Mwalimu Mbuku" className="h-9 w-9 object-contain" />
          <div className="flex-1">
            <h1 className="font-display text-base font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Étape {currentStep + 1}/{totalSteps}
          </span>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <Progress value={pct} className="h-2" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-border bg-card p-5 sm:p-8 shadow-sm"
        >
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">{stepTitle}</h2>
          <div className="mt-6 space-y-5">{children}</div>
        </motion.div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          {isLast ? (
            <Button type="button" onClick={onFinish} disabled={isSubmitting || !canProceed}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Terminer
            </Button>
          ) : (
            <Button type="button" onClick={onNext} disabled={isSubmitting || !canProceed}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Suivant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Vos réponses sont sauvegardées automatiquement.
        </p>
      </main>
    </div>
  );
}
