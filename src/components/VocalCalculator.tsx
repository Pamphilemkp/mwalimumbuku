"use client";

import { useState, useCallback } from 'react';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Volume2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import SpeechToText from './SpeechToText';

export default function VocalCalculator() {
  const { t, lang } = useLanguage();
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<{ expr: string; res: string }[]>([]);

  const calculate = useCallback(() => {
    try {
      const sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/().%\s]/g, '');
      if (!sanitized.trim()) return;
      const res = Function(`"use strict"; return (${sanitized})`)();
      const formatted = typeof res === 'number' ? (Number.isInteger(res) ? res.toString() : res.toFixed(4).replace(/\.?0+$/, '')) : String(res);
      setResult(formatted);
      setHistory((prev) => [{ expr: expression, res: formatted }, ...prev.slice(0, 9)]);
    } catch {
      setResult(t.calculator.error);
    }
  }, [expression, t]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    speechSynthesis.speak(utterance);
  };

  const handleVoiceInput = useCallback((text: string) => {
    const parsed = text.toLowerCase()
      .replace(/plus/g, '+').replace(/moins/g, '-').replace(/fois/g, '×')
      .replace(/multiplié par/g, '×').replace(/divisé par/g, '÷').replace(/sur/g, '÷')
      .replace(/times/g, '×').replace(/divided by/g, '÷').replace(/minus/g, '-')
      .replace(/égale?/g, '').replace(/equals?/g, '').replace(/virgule/g, '.').trim();
    setExpression(parsed);
  }, []);

  const appendToExpression = (val: string) => { setExpression((prev) => prev + val); setResult(null); };

  const buttons = [['7','8','9','÷'],['4','5','6','×'],['1','2','3','-'],['0','.','(','+'],[')',  '%','C','=']];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="rounded-xl bg-muted p-4 text-right space-y-1">
          <p className="text-sm text-muted-foreground min-h-[20px]">{expression || '0'}</p>
          {result !== null && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => speak(`${t.calculator.resultIs} ${result}`)}>
                <Volume2 className="h-4 w-4 text-primary" />
              </Button>
              <p className="text-3xl font-bold text-foreground">{result}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input value={expression} onChange={(e) => { setExpression(e.target.value); setResult(null); }}
            placeholder="Ex: 25 + 30 × 2" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && calculate()} />
          <SpeechToText onResult={handleVoiceInput} compact language={lang === 'fr' ? 'fr-FR' : 'en-US'} />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {buttons.flat().map((btn) => (
            <Button key={btn}
              variant={btn === '=' ? 'default' : btn === 'C' ? 'destructive' : /[÷×+\-]/.test(btn) ? 'secondary' : 'outline'}
              className={cn('h-12 text-lg font-medium', btn === '=' && 'bg-primary')}
              onClick={() => { if (btn === 'C') { setExpression(''); setResult(null); } else if (btn === '=') calculate(); else appendToExpression(btn); }}>
              {btn}
            </Button>
          ))}
        </div>
      </div>
      {history.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.calculator.history}</h4>
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">{h.expr}</span>
              <span className="font-medium text-foreground">= {h.res}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
