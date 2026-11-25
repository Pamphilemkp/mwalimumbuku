"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { translations, type Language } from "./translations";

const STORAGE_KEY = "mwalimu-lang";
const CHANGE_EVENT = "mwalimu-lang-change";

function readLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "fr" ? saved : "fr";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

const LanguageContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
  // The original copy object is large and both languages are read through the same keys.
  t: any;
}>({
  lang: "fr",
  setLang: () => {},
  t: translations.fr,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLanguage, () => "fr" as const);
  const setLang = useCallback((next: Language) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
