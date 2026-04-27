import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";

export const metadata: Metadata = {
  title: "QA Quest",
  description: "Playful, hands-on C# interview prep for QA engineers — patterns, code, and practice in one place."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&family=Comic+Neue:wght@400;700&family=Fredoka:wght@400;500;600;700&family=Nunito:ital,wght@0,400;0,600;0,700&family=Quicksand:wght@400;500;600;700&family=Varela+Round&display=swap&subset=latin,cyrillic,cyrillic-ext"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var f=localStorage.getItem('qa-quest-ui-font'),s=localStorage.getItem('qa-quest-ui-text-size');if(f==='sniglet'){f='varela-round';localStorage.setItem('qa-quest-ui-font',f);}if(f)document.documentElement.setAttribute('data-font',f);if(s)document.documentElement.setAttribute('data-text-size',s);}catch(e){}})();"
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
