import Link from "next/link";
import { PageTitle } from "@/components/layout/page-title";
import { InterviewQuestionsFiltersForm } from "@/components/interview-questions/interview-questions-filters-form";
import { InterviewQuestionsTable } from "@/components/interview-questions/interview-questions-table";
import { Button } from "@/components/ui/button";
import { getInterviewQuestionCategories, getInterviewQuestionsList } from "@/lib/api";
import type { InterviewQuestionListQuery } from "@/lib/interview-question-types";

function first(
  v: string | string[] | undefined
): string | undefined {
  if (v == null) {
    return undefined;
  }
  return Array.isArray(v) ? v[0] : v;
}

function toQuery(
  sp: Record<string, string | string[] | undefined>
): InterviewQuestionListQuery {
  const bool = (k: string) => first(sp[k]) === "true";
  return {
    q: first(sp.q),
    category: first(sp.category),
    difficulty: first(sp.difficulty),
    tag: first(sp.tag),
    sort: (first(sp.sort) as InterviewQuestionListQuery["sort"]) ?? "order",
    dir: (first(sp.dir) as InterviewQuestionListQuery["dir"]) ?? "asc",
    includeInactive: bool("includeInactive"),
    publishedOnly: bool("publishedOnly"),
    limit: 500
  };
}

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function InterviewQuestionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = toQuery(sp);
  const [categories, list] = await Promise.all([
    getInterviewQuestionCategories().catch(() => [] as string[]),
    getInterviewQuestionsList(query)
  ]);

  return (
    <div>
      <PageTitle
        title="Interview questions"
        subtitle="Open a row for the same coach experience as tasks (guided steps + mental model). Use New / Bulk to add, or the form to edit all fields."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/interview-questions/new">New question</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/interview-questions/bulk">Bulk add</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/problems">Back to problems</Link>
        </Button>
      </div>

      <InterviewQuestionsFiltersForm categories={categories} current={query} />
      <InterviewQuestionsTable questions={list} totalCount={list.length} />
    </div>
  );
}
