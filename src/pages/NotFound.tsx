import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <span className="font-display text-4xl font-bold text-primary">404</span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t.notFound?.title ?? 'Page introuvable'}</h1>
          <p className="mt-2 text-muted-foreground">{t.notFound?.desc ?? "La page que vous cherchez n'existe pas."}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button className="gap-2"><Home className="h-4 w-4" /> {t.notFound?.home ?? 'Accueil'}</Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> {t.back}
          </Button>
        </div>
      </div>
    </div>
  );
}
