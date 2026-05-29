import Link from "next/link";
import { PageTitle } from "@/components/layout/page-title";
import { InterviewQuestionEditor } from "@/components/interview-questions/interview-question-editor";
import { Button } from "@/components/ui/button";
import {
  INTERVIEW_LANGUAGE_TRACKS,
  type InterviewLanguageTrackId,
  INTERVIEW_LANGUAGE_TRACK_IDS
} from "@/lib/interview-language-tracks";

function first(v: string | string[] | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }
  return Array.isArray(v) ? v[0] : v;
}

function isTrackReturn(s: string | undefined): s is InterviewLanguageTrackId {
  return Boolean(s && (INTERVIEW_LANGUAGE_TRACK_IDS as readonly string[]).includes(s));
}

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewInterviewQuestionPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const prefillTag = first(sp.tag)?.trim();
  const returnTarget = first(sp.return)?.toLowerCase();
  const afterCreate: "interview" | InterviewLanguageTrackId = isTrackReturn(returnTarget)
    ? returnTarget
    : "interview";
  const trackLabel =
    afterCreate !== "interview" ? INTERVIEW_LANGUAGE_TRACKS[afterCreate].emptyIndexHintTrackName : null;

  return (
    <div>
      <PageTitle title="New interview question" subtitle="Add a single question, then open its detail page." />
      <div className="mb-4">
        <Button variant="secondary" asChild>
          <Link href="/interview-questions">Back to list</Link>
        </Button>
        {trackLabel ? (
          <span className="ml-2 text-sm text-muted-foreground">
            After save you return to the <strong>{trackLabel}</strong> coach tab.
          </span>
        ) : null}
      </div>
      <InterviewQuestionEditor
        key={`new-${prefillTag ?? "none"}-${afterCreate}`}
        mode="create"
        initial={null}
        prefillTag={prefillTag}
        afterCreate={afterCreate}
      />
    </div>
  );
}
