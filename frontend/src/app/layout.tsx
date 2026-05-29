import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import { qaQuestFontVariableClasses } from "@/lib/qa-fonts";

export const metadata: Metadata = {
  title: "QA Quest",
  description:
    "Interview prep for C#, Java, and Python — patterns, drills, flashcards, and coach practice."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // next/font exposes --font-* on this node; globals use :root / html[data-font] which IS <html>.
    <html lang="en" suppressHydrationWarning className={qaQuestFontVariableClasses}>
      {/*
       * Do NOT add a manual <head> here — it can suppress Next.js’s merged head and drop
       * the /_next/static/css/layout.css link (unstyled Tailwind markup). Fonts load via next/font.
       */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Script
          id="qa-quest-appearance-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var f=localStorage.getItem('qa-quest-ui-font'),s=localStorage.getItem('qa-quest-ui-text-size');if(f==='sniglet'){f='varela-round';localStorage.setItem('qa-quest-ui-font',f);}if(f)document.documentElement.setAttribute('data-font',f);if(s)document.documentElement.setAttribute('data-text-size',s);}catch(e){}})();"
          }}
        />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
