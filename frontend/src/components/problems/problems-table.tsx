import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProblemNavItem } from "@/lib/problem-types";

type PatternCount = { pattern: string; count: number };

export function ProblemsTable({
  problems,
  totalCount,
  patternCounts
}: {
  problems: ProblemNavItem[];
  totalCount: number;
  patternCounts: PatternCount[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Easy Starter Problems</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="default">Total: {totalCount}</Badge>
          {patternCounts.map((item) => (
            <Badge key={item.pattern} variant="secondary">
              {item.pattern}: {item.count}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-3">Problem</th>
              <th className="pb-3">Pattern</th>
              <th className="pb-3">Difficulty</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <tr key={problem.id} className="border-t">
                <td className="py-3 font-semibold">
                  <Link href={`/problems/${problem.id}`} className="hover:text-primary">
                    {problem.title}
                  </Link>
                </td>
                <td className="py-3">{problem.pattern}</td>
                <td className="py-3">{problem.difficulty}</td>
                <td className="py-3">
                  <Badge variant={problem.solved ? "secondary" : "default"}>{problem.solved ? "Solved" : "To Do"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
