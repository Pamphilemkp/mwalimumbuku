"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./language";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <Button variant="ghost" size="sm" onClick={() => setLang(lang === "fr" ? "en" : "fr")} className="gap-1.5 text-xs">
      <Globe className="h-3.5 w-3.5" />
      {lang === "fr" ? "EN" : "FR"}
    </Button>
  );
}
