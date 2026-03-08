import { useLanguage } from '@/i18n/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LanguageSwitcher({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' }) {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      className="gap-1.5 text-xs"
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === 'fr' ? 'EN' : 'FR'}
    </Button>
  );
}
