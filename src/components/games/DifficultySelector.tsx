"use client";

import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';
import { Shield, Swords, Flame } from 'lucide-react';
import type { Difficulty } from './types';

const levels: { key: Difficulty; icon: typeof Shield }[] = [
  { key: 'easy', icon: Shield },
  { key: 'medium', icon: Swords },
  { key: 'hard', icon: Flame },
];

export default function DifficultySelector({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">{t.games.level}:</span>
      <div className="flex flex-wrap justify-center gap-2">
        {levels.map((l) => (
          <button
            key={l.key}
            type="button"
            data-difficulty={l.key}
            onClick={() => onChange(l.key)}
            className={cn(
              'flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all',
              value === l.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <l.icon className="h-3 w-3" />
            {t.games.difficulties[l.key]}
          </button>
        ))}
      </div>
    </div>
  );
}
