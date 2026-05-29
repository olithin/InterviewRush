import { Sparkles, Flame, Star, CheckCircle2 } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { StatsGrid, StatsGridItem } from "@/components/dashboard/stats-grid";
import { WeakTopicsCard } from "@/components/dashboard/weak-topics-card";
import { getFlashcards, getGaps, getProblems } from "@/lib/api";

export default async function DashboardPage() {
  let problems: Awaited<ReturnType<typeof getProblems>> = [];
  let gaps: Awaited<ReturnType<typeof getGaps>> = [];
  let flashcards: Awaited<ReturnType<typeof getFlashcards>> = [];
  let apiError: string | null = null;

  try {
    [problems, gaps, flashcards] = await Promise.all([getProblems(), getGaps(), getFlashcards()]);
  } catch (error) {
    apiError =
      error instanceof Error
        ? error.message
        : "Backend API is not reachable. Deploy the API and set NEXT_PUBLIC_API_BASE_URL.";
  }

  if (apiError) {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "(not set — defaults to localhost:5000)";
    return (
      <div className="space-y-5">
        <PageTitle
          title="Dashboard"
          subtitle="Frontend is live on Netlify. Problem data needs the .NET API in the cloud."
        />
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 space-y-2">
          <p>
            <strong>API error:</strong> {apiError}
          </p>
          <p>
            <strong>NEXT_PUBLIC_API_BASE_URL:</strong> {apiUrl}
          </p>
          <p>
            Deploy the backend (e.g. Render free from <code className="text-xs">render.yaml</code> in the
            repo), run <code className="text-xs">import-content</code> once, then set the API URL on Netlify and
            redeploy.
          </p>
        </div>
      </div>
    );
  }

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
