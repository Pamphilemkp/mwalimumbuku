import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import type { GameProps } from './types';

export default function AlphabetGame({ onScore, difficulty }: GameProps) {
  const { t } = useLanguage();
  const count = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;

  const [letters, setLetters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const newGame = useCallback(() => {
    const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const start = Math.floor(Math.random() * (26 - count));
    const slice = all.slice(start, start + count);
    setCorrect([...slice]);
    setLetters([...slice].sort(() => Math.random() - 0.5));
    setSelected([]);
    setDone(false);
  }, [count]);

  useEffect(() => { newGame(); }, [newGame]);

  const selectLetter = (l: string) => {
    if (selected.includes(l)) return;
    const newSel = [...selected, l];
    setSelected(newSel);
    if (newSel.length === correct.length) {
      const isCorrect = newSel.every((s, i) => s === correct[i]);
      setDone(true);
      if (isCorrect) { onScore(30); toast.success(`🎉 ${t.games.perfectOrder}`); }
      else { toast.error(`❌ ${t.games.wrongOrder}`); }
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">{t.games.alphabetInstruction}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {correct.map((_, i) => (
          <div key={i} className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold',
            selected[i]
              ? (done ? (selected[i] === correct[i] ? 'border-primary bg-primary/10 text-primary' : 'border-destructive bg-destructive/10 text-destructive')
                : 'border-primary/50 bg-card text-foreground')
              : 'border-dashed border-border'
          )}>{selected[i] || ''}</div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {letters.map(l => (
          <button key={l} disabled={selected.includes(l) || done} onClick={() => selectLetter(l)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-bold transition-all',
              selected.includes(l) ? 'opacity-30 border-border' : 'border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer'
            )}>{l}</button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setSelected([]); setDone(false); }}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t.games.undo}
        </Button>
        <Button variant="outline" size="sm" onClick={newGame}>{t.games.newLetters}</Button>
      </div>
      {done && selected.every((s, i) => s === correct[i]) && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">{t.games.congratulations}</h3>
          <Button className="mt-3" onClick={newGame}>{t.games.playAgain}</Button>
        </div>
      )}
    </div>
  );
}
