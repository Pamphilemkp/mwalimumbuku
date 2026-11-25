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
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">{t.games.level}:</span>
      <div className="flex gap-1">
        {levels.map((l) => (
          <button
            key={l.key}
            onClick={() => onChange(l.key)}
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all',
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
