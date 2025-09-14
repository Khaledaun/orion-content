"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { Toaster } from "@/components/ui/sonner";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
        <Toaster />
      </LanguageProvider>
    </SessionProvider>
  );
}
