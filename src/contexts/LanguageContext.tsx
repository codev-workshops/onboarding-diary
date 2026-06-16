"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { Language } from "@/types";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>("en");

  useEffect(() => {
    const stored = (localStorage.getItem("aura-language") || localStorage.getItem("kapri-language")) as Language | null;
    if (stored) setLang(stored);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    localStorage.setItem("aura-language", lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
