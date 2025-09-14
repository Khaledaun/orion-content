import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { EnhancedErrorBoundary } from "@/components/ui/enhanced-error-boundary";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Orion CMS - Advanced Content Management System",
    template: "%s | Orion CMS",
  },
  description:
    "Professional content management system with advanced automation, analytics, and SEO optimization features.",
  keywords: [
    "CMS",
    "content management",
    "SEO",
    "automation",
    "analytics",
    "digital marketing",
  ],
  authors: [{ name: "Orion CMS Team" }],
  creator: "Orion CMS",
  publisher: "Orion CMS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Orion CMS - Advanced Content Management System",
    description:
      "Professional content management system with advanced automation, analytics, and SEO optimization features.",
    siteName: "Orion CMS",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Orion CMS Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orion CMS - Advanced Content Management System",
    description:
      "Professional content management system with advanced automation, analytics, and SEO optimization features.",
    images: ["/og-image.jpg"],
    creator: "@orioncms",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </head>
      <body className={inter.className}>
        <EnhancedErrorBoundary>
          <Providers>
            <div className="min-h-screen bg-background font-sans antialiased">
              {children}
            </div>
            <Toaster />
          </Providers>
        </EnhancedErrorBoundary>
      </body>
    </html>
  );
}
