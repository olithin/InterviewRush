"use client";

import { useEffect, useState } from "react";
import { ProblemLearningTracker } from "@/components/problems/problem-learning-tracker";
import { ProblemDetailsView, type ProblemDetailsLayout } from "@/components/problems/problem-details-view";
import { ProblemNavItem, ProblemTeachingDetails } from "@/lib/problem-types";

export function ProblemDetailsMount({ details, problems }: { details: ProblemTeachingDetails; problems: ProblemNavItem[] }) {
  const [mounted, setMounted] = useState(false);
  const layout: Partial<ProblemDetailsLayout> = {
    canManageProblemsFromSidebar: true,
    problemDeleteRedirectPath: "/problems",
    navHref: (id) => `/problems/${id}`,
    /** Guest: read-only list; after sign-in — links + coach. */
    sidebarNavRequiresAuth: true
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <ProblemLearningTracker problemId={details.id} />
      <ProblemDetailsView details={details} problems={problems} layout={layout} />
    </>
  );
}
