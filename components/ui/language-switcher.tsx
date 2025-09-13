'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { supportedLocales, type SupportedLocale } from '@/lib/i18n/dictionaries';

const languageNames: Record<SupportedLocale, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  he: { name: 'Hebrew', nativeName: 'עברית' },
};

interface LanguageSwitcherProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function LanguageSwitcher({ 
  variant = 'ghost', 
  size = 'sm',
  showText = false 
}: LanguageSwitcherProps) {
  const { locale, setLocale, dictionary } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="gap-2"
          aria-label={dictionary.accessibility.toggleLanguage}
        >
          <Globe className="h-4 w-4" />
          {showText && (
            <span className="hidden sm:inline">
              {languageNames[locale].nativeName}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {supportedLocales.map((localeOption) => (
          <DropdownMenuItem
            key={localeOption}
            onClick={() => setLocale(localeOption)}
            className={`flex items-center gap-2 ${
              locale === localeOption ? 'bg-accent' : ''
            }`}
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {languageNames[localeOption].nativeName}
              </span>
              <span className="text-xs text-muted-foreground">
                {languageNames[localeOption].name}
              </span>
            </div>
            {locale === localeOption && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}