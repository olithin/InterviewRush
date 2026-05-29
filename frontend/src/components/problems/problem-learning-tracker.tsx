"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { recordProblemOpened } from "@/lib/learning-map-progress";

export function ProblemLearningTracker({ problemId }: { problemId: number }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      return;
    }
    recordProblemOpened(problemId);
  }, [problemId, session?.user, status]);

  return null;
}
