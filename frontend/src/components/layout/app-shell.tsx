"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpenText, BrainCircuit, FileCode, Flame, Map, Network, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppearanceMenu } from "@/components/layout/appearance-menu";
import { LogoutButton } from "@/components/auth/logout-button";

const iconMap = {
  Dashboard: Trophy,
  "Patterns Map": Map,
  "Pattern Drill": BrainCircuit,
  Problems: BookOpenText,
  "C# Interview": FileCode,
  "Knowledge Map": Network,
  "Gap Map": Swords,
  Flashcards: Flame
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/patterns", label: "Patterns Map" },
  { href: "/pattern-drill", label: "Pattern Drill" },
  { href: "/problems", label: "Problems" },
  { href: "/interview/csharp", label: "C# Interview" },
  { href: "/knowledge-map", label: "Knowledge Map" },
  { href: "/gaps", label: "Gap Map" },
  { href: "/flashcards", label: "Flashcards" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const problemDetailWide =
    /^\/problems\/[^/]+$/.test(pathname ?? "") ||
    /^\/interview\/csharp\/[^/]+$/.test(pathname ?? "") ||
    /^\/interview-questions\/(?!new$|bulk$)[^/]+(\/edit)?$/.test(pathname ?? "") ||
    pathname === "/knowledge-map";

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6",
          problemDetailWide ? "max-w-[min(100%,92rem)]" : "max-w-7xl"
        )}
      >
        <header className="clay-surface relative z-30 rounded-[2.4rem_2rem_2.3rem_2.05rem/2.05rem_2.2rem_1.9rem_2.15rem] border border-white/65 bg-gradient-to-b from-[hsl(48,48%,99.2%)] via-[hsl(42,38%,98%)] to-[hsl(35,30%,90%)] p-5 shadow-clay ring-1 ring-inset ring-amber-50/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight text-primary">
                  {isLogin ? (
                    <Link href="/" className="transition hover:text-primary/90">
                      QA Quest
                    </Link>
                  ) : (
                    "QA Quest"
                  )}
                </h1>
                <div className="flex items-center gap-2">
                  <LogoutButton />
                  <AppearanceMenu className="shrink-0" />
                </div>
              </div>
              {!isLogin ? (
                <p className="mt-0.5 max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
                  A friendly, hands-on path through C# interview prep — one quest at a time.
                </p>
              ) : (
                <p className="mt-0.5 max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
                  Sign in below to use your personal notes and sharing.
                </p>
              )}
            </div>
            {!isLogin ? (
            <nav className="flex flex-1 flex-wrap justify-end gap-2 md:max-w-[min(100%,42rem)]">
              {navItems.map((item) => {
                const Icon = iconMap[item.label as keyof typeof iconMap] ?? Trophy;
                const active =
                  pathname === item.href ||
                  (item.href === "/problems" && (pathname?.startsWith("/problems/") ?? false)) ||
                  (item.href === "/interview/csharp" && (pathname?.startsWith("/interview/csharp/") ?? false)) ||
                  (item.href === "/knowledge-map" && (pathname?.startsWith("/knowledge-map") ?? false));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative inline-flex min-h-10 min-w-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full border border-white/50 bg-gradient-to-b from-amber-50/95 via-white to-orange-50/50 shadow-clay-sm ring-1 ring-inset ring-white/35"
                        transition={{ type: "spring", bounce: 0.45, stiffness: 320, damping: 22 }}
                      />
                    )}
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            ) : null}
          </div>
        </header>
        <main className="relative z-0">{children}</main>
      </div>
    </div>
  );
}
