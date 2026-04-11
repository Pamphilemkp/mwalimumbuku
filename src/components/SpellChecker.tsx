import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

const COMMON_ERRORS: Record<string, string> = {
  'apres': 'après', 'etre': 'être', 'eleve': 'élève', 'ecole': 'école',
  'francais': 'français', 'tres': 'très', 'pere': 'père', 'mere': 'mère',
  'frere': 'frère', 'probleme': 'problème', 'numero': 'numéro',
  'reponse': 'réponse', 'lecon': 'leçon', 'garcon': 'garçon',
  'ca': 'ça', 'deja': 'déjà', 'ou': 'où', 'a': 'à',
  'bientot': 'bientôt', 'controle': 'contrôle', 'hopital': 'hôpital',
  'interessant': 'intéressant', 'differant': 'différent', 'differend': 'différend',
  'cest': 'c\'est', 'jai': 'j\'ai', 'na': 'n\'a',
};

interface Suggestion { original: string; replacement: string; index: number; }

export default function SpellChecker() {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [checked, setChecked] = useState(false);

  const checkSpelling = () => {
    const words = text.toLowerCase().split(/\s+/);
    const found: Suggestion[] = [];
    let pos = 0;
    for (const word of words) {
      const clean = word.replace(/[.,!?;:]/g, '');
      if (COMMON_ERRORS[clean]) found.push({ original: clean, replacement: COMMON_ERRORS[clean], index: pos });
      pos += word.length + 1;
    }
    setSuggestions(found);
    setChecked(true);
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const regex = new RegExp(`\\b${suggestion.original}\\b`, 'gi');
    setText((prev) => prev.replace(regex, suggestion.replacement));
    setSuggestions((prev) => prev.filter((s) => s.original !== suggestion.original));
  };

  const applyAll = () => {
    let result = text;
    for (const s of suggestions) { const regex = new RegExp(`\\b${s.original}\\b`, 'gi'); result = result.replace(regex, s.replacement); }
    setText(result);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <Textarea value={text} onChange={(e) => { setText(e.target.value); setChecked(false); }}
        placeholder={t.spellChecker.placeholder} rows={6} className="text-base" spellCheck />
      <div className="flex items-center gap-3">
        <Button onClick={checkSpelling} disabled={!text.trim()} className="gap-2">
          <Sparkles className="h-4 w-4" /> {t.spellChecker.check}
        </Button>
        {suggestions.length > 0 && (
          <Button variant="outline" onClick={applyAll} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> {t.spellChecker.fixAll} ({suggestions.length})
          </Button>
        )}
        {checked && suggestions.length === 0 && (
          <span className="flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> {t.spellChecker.noErrors}
          </span>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm">
                  <span className="line-through text-muted-foreground">{s.original}</span>{' → '}
                  <span className="font-medium text-foreground">{s.replacement}</span>
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => applySuggestion(s)}>{t.spellChecker.fix}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
