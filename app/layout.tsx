import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { LanguageProvider } from "@/features/landing/language";
import { ProductProviders } from "@/src/providers";
import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mwalimu Mbuku",
  description:
    "Une plateforme d'apprentissage accessible et ludique conçue pour les élèves, parents et enseignants en Afrique.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className={`${bodyFont.className} min-h-screen`}>
        <LanguageProvider>
          <ProductProviders>{children}</ProductProviders>
        </LanguageProvider>
      </body>
    </html>
  );
}
