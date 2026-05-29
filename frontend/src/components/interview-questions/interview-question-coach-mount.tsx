"use client";

import { useEffect, useMemo, useState } from "react";
import { ProblemDetailsView, type ProblemDetailsLayout } from "@/components/problems/problem-details-view";
import { ProblemNavItem, ProblemTeachingDetails } from "@/lib/problem-types";

type Props = {
  details: ProblemTeachingDetails;
  problems: ProblemNavItem[];
};

function layoutFor(id: number): Partial<ProblemDetailsLayout> {
  return {
    navHref: (i) => `/interview-questions/${i}`,
    sidebarTitle: "Interview questions",
    navGroupBy: "none",
    pageSubtitle: "The same coach flow as coding tasks: reveal steps, mental model, then your spoken answer.",
    showPracticeMode: false,
    showApiCoachEditor: false,
    persistMentalToApi: false,
    howToThinkStorageKey: (i) => `qaquest:interview:questions:howToThinkNotes:${i}`,
    coachStep6: "interview-only",
    navBadge: "topic",
    showInterviewQuestionApiEditor: true,
    interviewDeleteRedirectPath: "/interview-questions"
  };
}

export function InterviewQuestionCoachMount({ details, problems }: Props) {
  const [mounted, setMounted] = useState(false);
  const layout = useMemo(
    () => layoutFor(details.id),
    [details.id]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-3" aria-hidden>
        <div className="h-12 animate-pulse rounded-2xl bg-muted/50" />
        <div className="min-h-[min(50vh,28rem)] animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  return <ProblemDetailsView details={details} problems={problems} layout={layout} />;
}
