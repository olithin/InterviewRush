"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { ProblemDetailsView, type ProblemDetailsLayout } from "@/components/problems/problem-details-view";
import { InterviewLearningTracker } from "@/components/problems/interview-learning-tracker";
import {
  type InterviewLanguageTrackId,
  INTERVIEW_LANGUAGE_TRACKS
} from "@/lib/interview-language-tracks";
import { ProblemNavItem, ProblemTeachingDetails } from "@/lib/problem-types";
import {
  getSeenInterviewQuestionIds,
  INTERVIEW_PROGRESS_UPDATE_EVENT
} from "@/lib/interview-question-progress";

function layoutFor(track: InterviewLanguageTrackId, currentQuestionId: number): Partial<ProblemDetailsLayout> {
  const t = INTERVIEW_LANGUAGE_TRACKS[track];
  return {
    navHref: (i) => `/interview/${t.segment}/${i}`,
    sidebarTitle: t.sidebarTitle,
    navGroupBy: "pattern",
    pageSubtitle: "Learning-first flow: think first, code second. 🧸",
    showPracticeMode: false,
    showApiCoachEditor: false,
    persistMentalToApi: false,
    howToThinkStorageKey: (i) => `qaquest:interview:${track}:howToThinkNotes:${i}`,
    understandNotesStorageKey: (i) => `qaquest:interview:${track}:understandNotes:${i}`,
    mentalModelStorageKey: (i) => `qaquest:interview:${track}:mentalModel:${i}`,
    coachStep6: "interview-only",
    navBadge: "topic",
    interviewNotebook: true,
    interviewEditFormHref: `/interview-questions/${currentQuestionId}/edit`,
    showInterviewQuestionApiEditor: true,
    interviewDeleteRedirectPath: `/interview/${t.segment}`,
    canReorderInterviewQuestions: true,
    canCreateInterviewQuestion: true,
    newQuestionDefaultTag: t.tabTag
  };
}

export function InterviewLanguageCoachMount({
  track,
  details,
  problems
}: {
  track: InterviewLanguageTrackId;
  details: ProblemTeachingDetails;
  problems: ProblemNavItem[];
}) {
  const { data: session, status: sessionStatus } = useSession();
  const canTrackSeen = sessionStatus === "authenticated" && session?.user != null;
  const [seenIds, setSeenIds] = useState<Set<number>>(() => new Set());
  const layout = useMemo(() => layoutFor(track, details.id), [track, details.id]);

  useEffect(() => {
    if (!canTrackSeen) {
      setSeenIds(new Set());
      return;
    }
    setSeenIds(getSeenInterviewQuestionIds());
  }, [canTrackSeen]);

  useEffect(() => {
    if (!canTrackSeen) {
      return;
    }
    const refresh = () => setSeenIds(getSeenInterviewQuestionIds());
    window.addEventListener(INTERVIEW_PROGRESS_UPDATE_EVENT, refresh);
    return () => window.removeEventListener(INTERVIEW_PROGRESS_UPDATE_EVENT, refresh);
  }, [canTrackSeen]);

  return (
    <>
      <InterviewLearningTracker questionId={details.id} />
      <ProblemDetailsView details={details} problems={problems} layout={layout} seenIds={seenIds} />
    </>
  );
}

/** Thin alias for the legacy C#-only import path. */
export function CSharpInterviewMount({
  details,
  problems
}: {
  details: ProblemTeachingDetails;
  problems: ProblemNavItem[];
}) {
  return <InterviewLanguageCoachMount track="csharp" details={details} problems={problems} />;
}
