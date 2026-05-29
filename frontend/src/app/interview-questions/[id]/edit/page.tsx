import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/layout/page-title";
import { InterviewQuestionEditor } from "@/components/interview-questions/interview-question-editor";
import { Button } from "@/components/ui/button";
import { getInterviewQuestionById } from "@/lib/api";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterviewQuestionEditPage({ params }: PageProps) {
  const { id: raw } = await params;
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) {
    notFound();
  }
  const q = await getInterviewQuestionById(id).catch(() => null);
  if (!q) {
    notFound();
  }

  return (
    <div>
      <PageTitle title={q.title} subtitle="Form editor — return to the coach when you are done." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/interview-questions/${id}`}>Open coach</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/interview-questions">All questions</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/interview-questions/new">New</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/interview-questions/bulk">Bulk add</Link>
        </Button>
      </div>
      <InterviewQuestionEditor mode="edit" initial={q} />
    </div>
  );
}
