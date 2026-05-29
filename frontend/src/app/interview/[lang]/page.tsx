import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/layout/page-title";
import { getInterviewTrackBySegment } from "@/lib/interview-language-tracks";
import { getInterviewQuestionsList } from "@/lib/api";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string }> };

export default async function InterviewLanguageIndexPage({ params }: PageProps) {
  const { lang: raw } = await params;
  const t = getInterviewTrackBySegment(raw);
  if (!t) {
    notFound();
  }

  let list: Awaited<ReturnType<typeof getInterviewQuestionsList>> = [];
  let apiError: string | null = null;
  try {
    list = await getInterviewQuestionsList({ tag: t.tabTag, limit: 500, sort: "order", dir: "asc" });
  } catch (e) {
    apiError = e instanceof Error ? e.message : "API request failed";
  }

  if (list.length > 0) {
    redirect(`/interview/${t.segment}/${list[0]!.id}`);
  }

  return (
    <div>
      <PageTitle
        title={t.emptyIndexTitle}
        subtitle="Questions for this track are loaded from the API by tag — same coach UI as coding tasks, without practice mode. Add items below; they are stored with all other interview questions."
      />
      {apiError ? (
        <p
          className="mb-4 rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive"
          role="alert"
        >
          <strong>Could not load the question list.</strong> {apiError} Start the backend or set{" "}
          <code className="rounded bg-white/60 px-1">NEXT_PUBLIC_API_BASE_URL</code> if the API runs elsewhere.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        No questions on this track yet. In <strong>Interview Q → New or Bulk</strong>, set tags to include{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{t.tabTag}</code>
        . Then open <strong>{t.emptyIndexHintTrackName}</strong> again from{" "}
        <a className="font-medium text-primary underline" href="/interview">
          Interview preparation
        </a>
        .
      </p>
    </div>
  );
}
