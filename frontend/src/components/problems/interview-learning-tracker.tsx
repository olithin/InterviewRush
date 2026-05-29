"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { recordInterviewQuestionSeen } from "@/lib/interview-question-progress";

export function InterviewLearningTracker({ questionId }: { questionId: number }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      return;
    }
    recordInterviewQuestionSeen(questionId);
  }, [questionId, session?.user, status]);

  return null;
}
