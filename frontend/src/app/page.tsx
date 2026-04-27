import { Sparkles, Flame, Star, CheckCircle2 } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { StatsGrid, StatsGridItem } from "@/components/dashboard/stats-grid";
import { WeakTopicsCard } from "@/components/dashboard/weak-topics-card";
import { getFlashcards, getGaps, getProblems } from "@/lib/api";

export default async function DashboardPage() {
  const [problems, gaps, flashcards] = await Promise.all([getProblems(), getGaps(), getFlashcards()]);
  const total = problems.length;
  const patternCounts = Array.from(
    problems.reduce((acc, item) => {
      acc.set(item.pattern, (acc.get(item.pattern) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  );

  const statsItems: StatsGridItem[] = [
    { label: "Problems", value: total, icon: Sparkles, color: "text-primary" },
    { label: "Patterns", value: patternCounts.length, icon: Flame, color: "text-orange-500" },
    { label: "Gaps", value: gaps.length, icon: Star, color: "text-sky-500" },
    { label: "Flashcards", value: flashcards.length, icon: CheckCircle2, color: "text-emerald-500" }
  ];

  const weakTopics = gaps.slice(0, 4).map((gap) => gap.topic);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Dashboard"
        subtitle="See what you’ve got in the bank — then pick the next small win to build your skills."
      />
      <StatsGrid items={statsItems} />
      <WeakTopicsCard topics={weakTopics} />
    </div>
  );
}
