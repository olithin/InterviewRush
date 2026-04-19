"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpenText, Flame, Map, Swords, Trophy } from "lucide-react";
import { navItems } from "@/data/mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: Trophy,
  "Patterns Map": Map,
  Problems: BookOpenText,
  "Gap Map": Swords,
  Flashcards: Flame
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border bg-card/90 p-4 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-primary">QA Quest</h1>
              <p className="text-sm text-muted-foreground">Level up your C# interview thinking 🎮</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = iconMap[item.label as keyof typeof iconMap] ?? Trophy;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                        transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                      />
                    )}
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
