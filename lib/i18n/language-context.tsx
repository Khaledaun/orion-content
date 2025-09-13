'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDictionary, type Dictionary, type SupportedLocale } from './dictionaries';

interface LanguageContextType {
  locale: SupportedLocale;
  dictionary: Dictionary;
  setLocale: (locale: SupportedLocale) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary('en'));

  const isRTL = locale === 'ar' || locale === 'he';

  useEffect(() => {
    // Load saved locale from localStorage
    const savedLocale = localStorage.getItem('orion-locale') as SupportedLocale;
    if (savedLocale && ['en', 'ar', 'he'].includes(savedLocale)) {
      setLocaleState(savedLocale);
      setDictionary(getDictionary(savedLocale));
    }
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    localStorage.setItem('orion-locale', newLocale);
    
    // Update HTML attributes for RTL support
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' || newLocale === 'he' ? 'rtl' : 'ltr';
  };

  return (
    <LanguageContext.Provider value={{ locale, dictionary, setLocale, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Convenience hook to get just the dictionary
export function useDictionary() {
  const { dictionary } = useLanguage();
  return dictionary;
}