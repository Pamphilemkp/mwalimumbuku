"use client";

import { useMemo } from 'react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { Check, X } from 'lucide-react';

interface Props {
  password: string;
}

export default function PasswordStrength({ password }: Props) {
  const { t } = useLanguage();

  const checks = useMemo(() => [
    { label: t.auth.pwMin8 ?? '8+ caractères', met: password.length >= 8 },
    { label: t.auth.pwUppercase ?? 'Majuscule (A-Z)', met: /[A-Z]/.test(password) },
    { label: t.auth.pwLowercase ?? 'Minuscule (a-z)', met: /[a-z]/.test(password) },
    { label: t.auth.pwNumber ?? 'Chiffre (0-9)', met: /[0-9]/.test(password) },
  ], [password, t]);

  const score = checks.filter(c => c.met).length;
  const strengthLabel = score <= 1 ? (t.auth.pwWeak ?? 'Faible') : score <= 2 ? (t.auth.pwFair ?? 'Moyen') : score <= 3 ? (t.auth.pwGood ?? 'Bon') : (t.auth.pwStrong ?? 'Fort');
  const strengthColor = score <= 1 ? 'bg-destructive' : score <= 2 ? 'bg-orange-500' : score <= 3 ? 'bg-yellow-500' : 'bg-primary';

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= score ? strengthColor : 'bg-muted')} />
        ))}
      </div>
      <p className={cn('text-xs font-medium', score <= 1 ? 'text-destructive' : score <= 3 ? 'text-muted-foreground' : 'text-primary')}>
        {strengthLabel}
      </p>
      <div className="space-y-1">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            {c.met ? <Check className="h-3 w-3 text-primary" /> : <X className="h-3 w-3 text-muted-foreground/50" />}
            <span className={cn(c.met ? 'text-foreground' : 'text-muted-foreground')}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
