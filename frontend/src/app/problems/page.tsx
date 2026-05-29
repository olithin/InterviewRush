import { PageTitle } from "@/components/layout/page-title";
import { ProblemsTable } from "@/components/problems/problems-table";
import { getProblems } from "@/lib/api";

export default async function ProblemsPage() {
  const problems = await getProblems();
  const totalCount = problems.length;
  const patternCounts = Array.from(
    problems.reduce((acc, item) => {
      acc.set(item.pattern, (acc.get(item.pattern) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => a.pattern.localeCompare(b.pattern));

  return (
    <div>
      <PageTitle title="Problems List" subtitle="Pick a challenge and learn with guided structure." />
      <ProblemsTable problems={problems} totalCount={totalCount} patternCounts={patternCounts} />
    </div>
  );
}
