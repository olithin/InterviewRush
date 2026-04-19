import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { problems } from "@/data/mock-data";

export function ProblemsTable() {
  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle>Easy Starter Problems</CardTitle>
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
