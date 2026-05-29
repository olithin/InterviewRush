import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewQuestionListItem } from "@/lib/interview-question-types";

export function InterviewQuestionsTable({
  questions,
  totalCount
}: {
  questions: InterviewQuestionListItem[];
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview questions</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="default">Total: {totalCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-3">Title</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Level</th>
              <th className="pb-3">Tags</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Form</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No questions match your filters. Try clearing search or add a new question.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="border-t">
                  <td className="max-w-xs py-3 font-semibold">
                    <Link href={`/interview-questions/${q.id}`} className="line-clamp-2 hover:text-primary">
                      {q.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-3">{q.category}</td>
                  <td className="py-3">{q.difficulty}</td>
                  <td className="max-w-[200px] py-3 text-xs text-muted-foreground">
                    {q.tags.length > 0 ? q.tags.join(", ") : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {q.isPublished ? (
                        <Badge variant="secondary">Published</Badge>
                      ) : (
                        <Badge variant="default">Draft</Badge>
                      )}
                      {!q.isActive ? <Badge variant="default">Inactive</Badge> : null}
                    </div>
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/interview-questions/${q.id}/edit`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
