import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Timer } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  duration: number; // seconds
  running: boolean;
  onTimeUp: () => void;
}

export default function GameTimer({ duration, running, onTimeUp }: Props) {
  const { t } = useLanguage();
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => { setRemaining(duration); }, [duration]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { onTimeUp(); return; }
    const iv = setInterval(() => setRemaining(r => {
      if (r <= 1) { onTimeUp(); return 0; }
      return r - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [running, remaining, onTimeUp]);

  const pct = (remaining / duration) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining <= 10;

  return (
    <div className="flex items-center gap-2">
      <Timer className={cn('h-4 w-4', isLow ? 'text-destructive animate-pulse' : 'text-muted-foreground')} />
      <div className="flex items-center gap-2">
        <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', isLow ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn('text-xs font-mono font-bold tabular-nums', isLow ? 'text-destructive' : 'text-foreground')}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
