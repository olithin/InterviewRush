import { PageTitle } from "@/components/layout/page-title";
import { PatternsGrid, PatternProgress } from "@/components/patterns/patterns-grid";
import { getProblems } from "@/lib/api";
import { patternChoiceHelper, patternGuides } from "@/data/pattern-guides";

const patternStatus = (value: number): PatternProgress["status"] => {
  if (value >= 80) return "Mastered";
  if (value >= 60) return "Strong";
  if (value >= 40) return "Learning";
  return "Weak";
};

export default async function PatternsPage() {
  const problems = await getProblems();
  const total = problems.length;

  const patternCounts = Array.from(
    problems.reduce((acc, item) => {
      acc.set(item.pattern, (acc.get(item.pattern) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  );

  const progress: PatternProgress[] = patternCounts
    .map(([pattern, count]) => ({
      name: pattern,
      progress: total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0,
      status: patternStatus(total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0)
    }))
    .sort((a, b) => b.progress - a.progress);

  return (
    <div>
      <PageTitle title="Patterns Map" subtitle="See which algorithm patterns are strong and which need practice." />
      <PatternsGrid progress={progress} guides={patternGuides} helper={patternChoiceHelper} />
    </div>
  );
}
